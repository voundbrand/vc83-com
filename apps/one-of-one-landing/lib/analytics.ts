"use client";

type TelemetryPrimitive = string | number | boolean;

type LandingFunnelEventName =
  | "onboarding.funnel.first_touch"
  | "onboarding.funnel.activation"
  | "onboarding.funnel.signup"
  | "onboarding.funnel.upgrade"
  | "onboarding.funnel.channel_first_message_latency"
  | "onboarding.funnel.audit_started"
  | "onboarding.funnel.audit_question_answered"
  | "onboarding.funnel.audit_completed"
  | "onboarding.funnel.audit_handoff_opened"
  | "onboarding.funnel.experiment_exposure";

interface CampaignAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPath?: string;
}

export interface LandingContinuityContext {
  hasSessionToken: boolean;
  hasClaimToken: boolean;
}

interface LandingAnalyticsPayload {
  eventName: LandingFunnelEventName;
  app: "one_of_one_landing";
  channel: "native_guest";
  occurredAt: number;
  campaign?: CampaignAttribution;
  continuity: LandingContinuityContext;
  experiments?: Record<string, string>;
  metadata?: Record<string, TelemetryPrimitive>;
}

export interface TrackLandingEventArgs {
  eventName: LandingFunnelEventName;
  continuity?: Partial<LandingContinuityContext>;
  metadata?: Record<string, unknown>;
  onceKey?: string;
}

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    posthog?: {
      capture?: (event: string, properties?: Record<string, unknown>) => void;
    };
    __OOOLandingAnalytics?: LandingAnalyticsPayload[];
  }
}

const STORAGE_PREFIX = "l4yercak3_native_guest_";
const SESSION_TOKEN_KEY = `${STORAGE_PREFIX}session_token`;
const CLAIM_TOKEN_KEY = `${STORAGE_PREFIX}claim_token`;

const ANALYTICS_EVENT = "ooo-landing-analytics";
const ENTRYPOINT_AT_KEY = "ooo_landing_entrypoint_at";
const EVENT_ONCE_PREFIX = "ooo_landing_once_";
const MAX_STRING_LENGTH = 140;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function sanitizeString(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_STRING_LENGTH);
}

function sanitizeTelemetryValue(value: unknown): TelemetryPrimitive | undefined {
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  return undefined;
}

function sanitizeMetadata(
  metadata?: Record<string, unknown>
): Record<string, TelemetryPrimitive> | undefined {
  if (!metadata) return undefined;
  const cleaned: Record<string, TelemetryPrimitive> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = sanitizeString(key);
    if (!normalizedKey) continue;

    const normalizedValue = sanitizeTelemetryValue(value);
    if (typeof normalizedValue === "undefined") continue;

    cleaned[normalizedKey] = normalizedValue;
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function readLocalStorageValue(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readSessionStorageValue(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorageValue(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Non-blocking telemetry write.
  }
}

function readCurrentUrl(): URL | null {
  if (!isBrowser()) return null;
  try {
    return new URL(window.location.href);
  } catch {
    return null;
  }
}

function readUtmValue(url: URL, snakeKey: string, camelKey: string): string | undefined {
  return sanitizeString(url.searchParams.get(snakeKey) || url.searchParams.get(camelKey) || "");
}

function normalizeReferrer(referrer: string): string | undefined {
  const cleaned = sanitizeString(referrer);
  if (!cleaned) return undefined;

  try {
    const parsed = new URL(cleaned);
    return sanitizeString(`${parsed.origin}${parsed.pathname}`);
  } catch {
    const withoutQuery = cleaned.split("?")[0];
    return sanitizeString(withoutQuery);
  }
}

function buildLandingPath(url: URL): string | undefined {
  const filtered = new URLSearchParams();

  for (const [key, value] of url.searchParams.entries()) {
    const normalizedKey = key.toLowerCase();
    const include =
      normalizedKey.startsWith("utm_")
      || normalizedKey.startsWith("exp_")
      || normalizedKey === "experiment"
      || normalizedKey === "variant";

    if (!include) continue;
    const sanitized = sanitizeString(value);
    if (!sanitized) continue;
    filtered.set(key, sanitized);
  }

  const query = filtered.toString();
  return sanitizeString(query.length > 0 ? `${url.pathname}?${query}` : url.pathname);
}

function resolveCampaignAttribution(): CampaignAttribution | undefined {
  const url = readCurrentUrl();
  if (!url) return undefined;

  const attribution: CampaignAttribution = {
    source: readUtmValue(url, "utm_source", "utmSource"),
    medium: readUtmValue(url, "utm_medium", "utmMedium"),
    campaign: readUtmValue(url, "utm_campaign", "utmCampaign"),
    content: readUtmValue(url, "utm_content", "utmContent"),
    term: readUtmValue(url, "utm_term", "utmTerm"),
    referrer: normalizeReferrer(document.referrer || ""),
    landingPath: buildLandingPath(url),
  };

  const hasSignal = Object.values(attribution).some((value) => typeof value === "string" && value.length > 0);
  return hasSignal ? attribution : undefined;
}

function resolveExperimentContext(): Record<string, string> | undefined {
  const url = readCurrentUrl();
  if (!url) return undefined;

  const experiments: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    const normalizedKey = key.toLowerCase();
    const include =
      normalizedKey.startsWith("exp_")
      || normalizedKey === "experiment"
      || normalizedKey === "variant";
    if (!include) continue;

    const safeKey = sanitizeString(normalizedKey);
    const safeValue = sanitizeString(value);
    if (!safeKey || !safeValue) continue;

    experiments[safeKey] = safeValue;
  }

  return Object.keys(experiments).length > 0 ? experiments : undefined;
}

function readStoredEntrypointAt(): number | null {
  const stored = readSessionStorageValue(ENTRYPOINT_AT_KEY);
  if (!stored) return null;
  const parsed = Number(stored);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function ensureEntrypointTimestamp(): number {
  const existing = readStoredEntrypointAt();
  if (existing) return existing;
  const created = Date.now();
  writeSessionStorageValue(ENTRYPOINT_AT_KEY, String(created));
  return created;
}

function markOnce(onceKey: string): void {
  writeSessionStorageValue(`${EVENT_ONCE_PREFIX}${onceKey}`, "1");
}

function hasMarkedOnce(onceKey: string): boolean {
  return readSessionStorageValue(`${EVENT_ONCE_PREFIX}${onceKey}`) === "1";
}

export function resolveLandingContinuityContext(
  overrides?: Partial<LandingContinuityContext>
): LandingContinuityContext {
  const hasSessionToken =
    typeof overrides?.hasSessionToken === "boolean"
      ? overrides.hasSessionToken
      : Boolean(readLocalStorageValue(SESSION_TOKEN_KEY));

  const hasClaimToken =
    typeof overrides?.hasClaimToken === "boolean"
      ? overrides.hasClaimToken
      : Boolean(readLocalStorageValue(CLAIM_TOKEN_KEY));

  return {
    hasSessionToken,
    hasClaimToken,
  };
}

export function resolveLandingEntrypointLatencyMs(at: number = Date.now()): number | undefined {
  if (!isBrowser()) return undefined;
  const entrypointAt = readStoredEntrypointAt() || ensureEntrypointTimestamp();
  if (!Number.isFinite(entrypointAt)) return undefined;

  const latency = Math.max(0, at - entrypointAt);
  return Number.isFinite(latency) ? latency : undefined;
}

export function toTelemetryDestination(url: string): string | undefined {
  const sanitized = sanitizeString(url);
  if (!sanitized) return undefined;

  try {
    const parsed = new URL(sanitized, window.location.origin);
    return sanitizeString(`${parsed.origin}${parsed.pathname}`);
  } catch {
    return undefined;
  }
}

function dispatchLandingAnalytics(payload: LandingAnalyticsPayload): void {
  if (!isBrowser()) return;

  try {
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: payload }));
  } catch {
    // Keep telemetry non-blocking.
  }

  try {
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: payload.eventName,
        ...payload,
      });
    }
  } catch {
    // Keep telemetry non-blocking.
  }

  try {
    window.posthog?.capture?.(payload.eventName, payload as unknown as Record<string, unknown>);
  } catch {
    // Keep telemetry non-blocking.
  }

  if (process.env.NODE_ENV !== "production") {
    const queue = window.__OOOLandingAnalytics || [];
    queue.push(payload);
    window.__OOOLandingAnalytics = queue.slice(-200);
  }
}

export function trackLandingEvent(args: TrackLandingEventArgs): void {
  if (!isBrowser()) return;

  const onceKey = sanitizeString(args.onceKey || "");
  if (onceKey && hasMarkedOnce(onceKey)) return;

  ensureEntrypointTimestamp();

  const payload: LandingAnalyticsPayload = {
    eventName: args.eventName,
    app: "one_of_one_landing",
    channel: "native_guest",
    occurredAt: Date.now(),
    campaign: resolveCampaignAttribution(),
    continuity: resolveLandingContinuityContext(args.continuity),
    experiments: resolveExperimentContext(),
    metadata: sanitizeMetadata(args.metadata),
  };

  dispatchLandingAnalytics(payload);
  if (onceKey) markOnce(onceKey);
}

export function trackLandingPageView(continuity?: Partial<LandingContinuityContext>): void {
  trackLandingEvent({
    eventName: "onboarding.funnel.first_touch",
    continuity,
    onceKey: "page_view",
    metadata: {
      entrypoint: "one_of_one_landing",
      surface: "landing_page",
    },
  });

  const experiments = resolveExperimentContext();
  if (!experiments) return;

  trackLandingEvent({
    eventName: "onboarding.funnel.experiment_exposure",
    continuity,
    onceKey: "experiment_exposure",
    metadata: {
      experimentCount: Object.keys(experiments).length,
      experimentKeys: Object.keys(experiments).sort().join(","),
    },
  });
}

