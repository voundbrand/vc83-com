export type CookieConsentDecision = "accepted" | "declined";
export type CookieConsentState = CookieConsentDecision | null;

type CookieConsentSnapshot = {
  decision: CookieConsentDecision;
  policyVersion: string;
  updatedAt: number;
};

const LEGACY_DECISIONS = new Set<CookieConsentDecision>(["accepted", "declined"]);

export const COOKIE_CONSENT_STORAGE_KEY = "cookie_consent";
export const COOKIE_CONSENT_EVENT = "vc83:cookie-consent-updated";
export const COOKIE_POLICY_VERSION = "2026-03-27";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parseCookieConsentSnapshot(value: string | null): CookieConsentSnapshot | null {
  if (!value) {
    return null;
  }

  if (LEGACY_DECISIONS.has(value as CookieConsentDecision)) {
    return {
      decision: value as CookieConsentDecision,
      policyVersion: "legacy",
      updatedAt: 0,
    };
  }

  try {
    const parsed = JSON.parse(value) as Partial<CookieConsentSnapshot>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const decision = parsed.decision;
    if (!decision || !LEGACY_DECISIONS.has(decision as CookieConsentDecision)) {
      return null;
    }

    return {
      decision: decision as CookieConsentDecision,
      policyVersion:
        typeof parsed.policyVersion === "string" && parsed.policyVersion.trim().length > 0
          ? parsed.policyVersion
          : "legacy",
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

function readStoredSnapshot(): CookieConsentSnapshot | null {
  if (!isBrowser()) {
    return null;
  }

  return parseCookieConsentSnapshot(
    window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY),
  );
}

export function getStoredCookieConsent(): CookieConsentState {
  return readStoredSnapshot()?.decision ?? null;
}

export function getStoredCookieConsentForPolicyVersion(
  policyVersion: string = COOKIE_POLICY_VERSION,
): CookieConsentState {
  const snapshot = readStoredSnapshot();
  if (!snapshot || snapshot.policyVersion !== policyVersion) {
    return null;
  }
  return snapshot.decision;
}

export function getStoredCookieConsentSnapshot(): CookieConsentSnapshot | null {
  return readStoredSnapshot();
}

export function isAnalyticsConsentGranted(): boolean {
  return getStoredCookieConsent() === "accepted";
}

export function setCookieConsent(
  decision: CookieConsentDecision,
  policyVersion: string = COOKIE_POLICY_VERSION,
): CookieConsentSnapshot {
  const snapshot: CookieConsentSnapshot = {
    decision,
    policyVersion,
    updatedAt: Date.now(),
  };

  if (!isBrowser()) {
    return snapshot;
  }

  window.localStorage.setItem(
    COOKIE_CONSENT_STORAGE_KEY,
    JSON.stringify(snapshot),
  );
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_EVENT, {
      detail: snapshot,
    }),
  );

  return snapshot;
}

export function revokeCookieConsent(
  policyVersion: string = COOKIE_POLICY_VERSION,
): CookieConsentSnapshot {
  return setCookieConsent("declined", policyVersion);
}
