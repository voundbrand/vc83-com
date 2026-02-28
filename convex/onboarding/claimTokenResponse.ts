export function normalizeClaimTokenForResponse(claimToken: unknown): string | null {
  if (typeof claimToken !== "string") {
    return null;
  }

  const normalized = claimToken.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeEmailForResponse(email: unknown): string | null {
  if (typeof email !== "string") {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized) ? normalized : null;
}

export function normalizeOptionalNameForResponse(name: unknown): string | null {
  if (typeof name !== "string") {
    return null;
  }

  const normalized = name.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return null;
  }

  return normalized.slice(0, 120);
}
