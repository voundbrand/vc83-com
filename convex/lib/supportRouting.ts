export type SupportRecipientSource = "organization_contact" | "support_env" | "fallback";

const PLATFORM_SUPPORT_FALLBACK = "support@l4yercak3.com";

function normalizeEmailCandidate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isSalesMailbox(email: string, salesMailbox?: string | null): boolean {
  const normalized = email.trim().toLowerCase();
  const normalizedSalesMailbox = salesMailbox?.trim().toLowerCase();

  if (normalizedSalesMailbox && normalized === normalizedSalesMailbox) {
    return true;
  }

  return normalized.startsWith("sales@");
}

export function resolveSupportRecipient(args: {
  organizationSupportEmail?: string | null;
  envSupportEmail?: string | null;
  envSalesEmail?: string | null;
}): {
  email: string;
  source: SupportRecipientSource;
  preventedSalesRoute: boolean;
} {
  const candidates: Array<{ email: string | null; source: SupportRecipientSource }> = [
    {
      email: normalizeEmailCandidate(args.organizationSupportEmail),
      source: "organization_contact",
    },
    {
      email: normalizeEmailCandidate(args.envSupportEmail),
      source: "support_env",
    },
    {
      email: PLATFORM_SUPPORT_FALLBACK,
      source: "fallback",
    },
  ];

  let preventedSalesRoute = false;

  for (const candidate of candidates) {
    if (!candidate.email) {
      continue;
    }

    if (isSalesMailbox(candidate.email, args.envSalesEmail)) {
      preventedSalesRoute = true;
      continue;
    }

    return {
      email: candidate.email,
      source: candidate.source,
      preventedSalesRoute,
    };
  }

  return {
    email: PLATFORM_SUPPORT_FALLBACK,
    source: "fallback",
    preventedSalesRoute: true,
  };
}
