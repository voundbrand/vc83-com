export interface BookingConciergeDefaults {
  primaryResourceLabel?: string;
  timezone?: string;
  defaultMeetingTitle?: string;
  intakeLabel?: string;
  requireConfiguredResource?: boolean;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeIndustry(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function isLawFirmIndustry(value: unknown): boolean {
  const normalized = normalizeIndustry(value);
  return normalized === "law_firm" || normalized === "lawfirm" || normalized === "kanzlei";
}

export function buildBookingConciergeDefaults(args: {
  industry?: string;
  language?: string;
  timezone?: string;
}): BookingConciergeDefaults | undefined {
  if (!isLawFirmIndustry(args.industry)) {
    return undefined;
  }

  const normalizedLanguage = normalizeOptionalString(args.language)?.toLowerCase();
  const germanDefaults = normalizedLanguage?.startsWith("de") ?? false;
  const defaultLabel = germanDefaults ? "Erstberatung" : "Initial Consultation";

  return {
    primaryResourceLabel: defaultLabel,
    timezone: normalizeOptionalString(args.timezone),
    defaultMeetingTitle: defaultLabel,
    intakeLabel: defaultLabel,
    requireConfiguredResource: false,
  };
}
