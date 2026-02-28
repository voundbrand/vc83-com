import {
  readLandingAuditState,
  type LandingAuditMessage,
  type LandingAuditStateSnapshot,
} from "./audit-chat-client";

interface CampaignAttribution {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPath?: string;
}

export interface LandingAuditHandoffState extends LandingAuditStateSnapshot {
  userMessages: number;
  assistantMessages: number;
  isAuditReady: boolean;
}

export interface LandingHandoffLinks {
  resumeChatUrl: string;
  doneWithYouUrl: string;
  fullBuildUrl: string;
  createAccountUrl: string;
  iphoneDownloadUrl: string | null;
  macosDownloadUrl: string | null;
  webAppUrl: string;
}

const EMPTY_AUDIT_HANDOFF_STATE: LandingAuditHandoffState = {
  messages: [],
  sessionToken: null,
  claimToken: null,
  userMessages: 0,
  assistantMessages: 0,
  isAuditReady: false,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function resolveAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || "";
  return configured.replace(/\/+$/, "");
}

export function readLandingCampaignAttribution(): CampaignAttribution | undefined {
  if (!isBrowser()) return undefined;
  const url = new URL(window.location.href);
  const attribution: CampaignAttribution = {
    source: url.searchParams.get("utm_source") || url.searchParams.get("utmSource") || undefined,
    medium: url.searchParams.get("utm_medium") || url.searchParams.get("utmMedium") || undefined,
    campaign: url.searchParams.get("utm_campaign") || url.searchParams.get("utmCampaign") || undefined,
    content: url.searchParams.get("utm_content") || url.searchParams.get("utmContent") || undefined,
    term: url.searchParams.get("utm_term") || url.searchParams.get("utmTerm") || undefined,
    referrer: document.referrer || undefined,
    landingPath: `${url.pathname}${url.search}`,
  };

  const hasSignal = Object.values(attribution).some(
    (value) => typeof value === "string" && value.length > 0
  );
  return hasSignal ? attribution : undefined;
}

function withOnboardingAttribution(args: {
  url: string;
  attribution?: CampaignAttribution;
  claimToken?: string | null;
  sessionToken?: string | null;
}): string {
  try {
    const baseUrl = resolveAppBaseUrl();
    const parsed = baseUrl ? new URL(args.url, baseUrl) : new URL(args.url, "https://app.local");
    parsed.searchParams.set("onboardingChannel", "native_guest");

    if (args.claimToken) parsed.searchParams.set("identityClaimToken", args.claimToken);
    if (args.sessionToken) parsed.searchParams.set("guestSession", args.sessionToken);

    if (args.attribution?.source) parsed.searchParams.set("utm_source", args.attribution.source);
    if (args.attribution?.medium) parsed.searchParams.set("utm_medium", args.attribution.medium);
    if (args.attribution?.campaign) parsed.searchParams.set("utm_campaign", args.attribution.campaign);
    if (args.attribution?.content) parsed.searchParams.set("utm_content", args.attribution.content);
    if (args.attribution?.term) parsed.searchParams.set("utm_term", args.attribution.term);
    if (args.attribution?.referrer) parsed.searchParams.set("referrer", args.attribution.referrer);
    if (args.attribution?.landingPath) parsed.searchParams.set("landingPath", args.attribution.landingPath);
    if (baseUrl) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return args.url;
  }
}

function buildAccountSignupUrl(args: {
  appBaseUrl: string;
  callbackUrl: string;
  claimToken?: string | null;
  attribution?: CampaignAttribution;
}): string {
  const params = new URLSearchParams({
    provider: "google",
    sessionType: "platform",
    onboardingChannel: "native_guest",
    callback: args.callbackUrl,
  });

  if (args.claimToken) {
    params.set("identityClaimToken", args.claimToken);
  }

  if (args.attribution?.source) params.set("utm_source", args.attribution.source);
  if (args.attribution?.medium) params.set("utm_medium", args.attribution.medium);
  if (args.attribution?.campaign) params.set("utm_campaign", args.attribution.campaign);
  if (args.attribution?.content) params.set("utm_content", args.attribution.content);
  if (args.attribution?.term) params.set("utm_term", args.attribution.term);
  if (args.attribution?.referrer) params.set("referrer", args.attribution.referrer);
  if (args.attribution?.landingPath) params.set("landingPath", args.attribution.landingPath);

  return `${args.appBaseUrl}/api/auth/oauth-signup?${params.toString()}`;
}

function hasWorkflowSignal(message: LandingAuditMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }

  const normalized = message.content.toLowerCase();
  return (
    normalized.includes("based on what you've told me")
    || normalized.includes("highest-leverage workflow")
    || normalized.includes("workflow")
  );
}

function normalizeOptionalUrl(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const baseUrl = resolveAppBaseUrl();
    if (baseUrl) {
      return new URL(trimmed, baseUrl).toString();
    }
    return new URL(trimmed, "https://app.local").toString().replace("https://app.local", "");
  } catch {
    return null;
  }
}

export function readLandingAuditHandoffState(): LandingAuditHandoffState {
  const snapshot = readLandingAuditState();
  const userMessages = snapshot.messages.filter((message) => message.role === "user").length;
  const assistantMessages = snapshot.messages.filter((message) => message.role === "assistant").length;
  const workflowDetected = snapshot.messages.some(hasWorkflowSignal);

  return {
    ...snapshot,
    userMessages,
    assistantMessages,
    isAuditReady: workflowDetected || (userMessages >= 3 && assistantMessages >= 3),
  };
}

export function getEmptyLandingAuditHandoffState(): LandingAuditHandoffState {
  return EMPTY_AUDIT_HANDOFF_STATE;
}

export function buildLandingHandoffLinks(
  state: LandingAuditHandoffState,
  attribution?: CampaignAttribution
): LandingHandoffLinks {
  const appBaseUrl = resolveAppBaseUrl();
  const baseChatUrl = `${appBaseUrl}/chat`;

  const resumeChatUrl = withOnboardingAttribution({
    url: `${baseChatUrl}?handoff=one-of-one&intent=resume`,
    attribution,
    claimToken: state.claimToken,
    sessionToken: state.sessionToken,
  });

  const doneWithYouUrl = withOnboardingAttribution({
    url: `${baseChatUrl}?handoff=one-of-one&intent=done-with-you`,
    attribution,
    claimToken: state.claimToken,
    sessionToken: state.sessionToken,
  });

  const fullBuildUrl = withOnboardingAttribution({
    url: `${baseChatUrl}?handoff=one-of-one&intent=full-build`,
    attribution,
    claimToken: state.claimToken,
    sessionToken: state.sessionToken,
  });

  return {
    resumeChatUrl,
    doneWithYouUrl,
    fullBuildUrl,
    createAccountUrl: buildAccountSignupUrl({
      appBaseUrl,
      callbackUrl: resumeChatUrl,
      claimToken: state.claimToken,
      attribution,
    }),
    iphoneDownloadUrl: normalizeOptionalUrl(process.env.NEXT_PUBLIC_ONE_OF_ONE_IPHONE_URL),
    macosDownloadUrl: normalizeOptionalUrl(process.env.NEXT_PUBLIC_ONE_OF_ONE_MACOS_URL),
    webAppUrl: resumeChatUrl,
  };
}
