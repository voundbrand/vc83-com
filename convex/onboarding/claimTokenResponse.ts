export function normalizeClaimTokenForResponse(claimToken: unknown): string | null {
  if (typeof claimToken !== "string") {
    return null;
  }

  const normalized = claimToken.trim();
  return normalized.length > 0 ? normalized : null;
}
