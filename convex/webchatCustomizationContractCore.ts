export type PublicInboundChannel = "webchat" | "native_guest";
export type WebchatWidgetPosition = "bottom-right" | "bottom-left";

export interface WebchatCustomizationContract {
  welcomeMessage: string;
  brandColor: string;
  position: WebchatWidgetPosition;
  collectContactInfo: boolean;
  bubbleText: string;
  offlineMessage: string;
  language: string;
}

export type WebchatCustomizationOverrides = Partial<WebchatCustomizationContract>;

export const WEBCHAT_BOOTSTRAP_CONTRACT_VERSION = "2026-02-18.webchat-bootstrap.v1";

export const WEBCHAT_CUSTOMIZATION_FIELDS = [
  "welcomeMessage",
  "brandColor",
  "position",
  "collectContactInfo",
  "bubbleText",
  "offlineMessage",
  "language",
] as const;

export type WebchatCustomizationField = typeof WEBCHAT_CUSTOMIZATION_FIELDS[number];

export const WEBCHAT_CUSTOMIZATION_DEFAULTS: WebchatCustomizationContract = {
  welcomeMessage: "Hallo! Wie konnen wir Ihnen helfen?",
  brandColor: "#7c3aed",
  position: "bottom-right",
  collectContactInfo: true,
  bubbleText: "Chat",
  offlineMessage: "Wir sind gerade nicht erreichbar. Bitte versuchen Sie es spater erneut.",
  language: "de",
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;

function normalizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return undefined;
  }
  return normalized.slice(0, maxLength);
}

function normalizeBrandColor(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return undefined;
  }

  const lower = trimmed.toLowerCase();
  if (lower.length === 4) {
    const r = lower[1];
    const g = lower[2];
    const b = lower[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return lower;
}

function normalizeLanguage(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().replace(/_/g, "-");
  if (!LANGUAGE_PATTERN.test(trimmed)) {
    return undefined;
  }

  const parts = trimmed.split("-");
  if (parts.length === 1) {
    return parts[0].toLowerCase();
  }

  const [base, ...rest] = parts;
  return [
    base.toLowerCase(),
    ...rest.map((part, index) => {
      if (index === 0 && part.length === 2) {
        return part.toUpperCase();
      }
      return part;
    }),
  ].join("-");
}

function normalizePosition(value: unknown): WebchatWidgetPosition | undefined {
  if (value === "bottom-left" || value === "bottom-right") {
    return value;
  }
  return undefined;
}

export function isWebchatCustomizationChannel(channel: string): channel is PublicInboundChannel {
  return channel === "webchat" || channel === "native_guest";
}

export function normalizeWebchatCustomizationOverrides(
  rawConfig?: Record<string, unknown> | null
): WebchatCustomizationOverrides {
  if (!rawConfig || typeof rawConfig !== "object") {
    return {};
  }

  const overrides: WebchatCustomizationOverrides = {};

  const welcomeMessage = normalizeString(rawConfig.welcomeMessage, 500);
  if (welcomeMessage) {
    overrides.welcomeMessage = welcomeMessage;
  }

  const brandColor = normalizeBrandColor(rawConfig.brandColor);
  if (brandColor) {
    overrides.brandColor = brandColor;
  }

  const position = normalizePosition(rawConfig.position);
  if (position) {
    overrides.position = position;
  }

  if (typeof rawConfig.collectContactInfo === "boolean") {
    overrides.collectContactInfo = rawConfig.collectContactInfo;
  }

  const bubbleText = normalizeString(rawConfig.bubbleText, 80);
  if (bubbleText) {
    overrides.bubbleText = bubbleText;
  }

  const offlineMessage = normalizeString(rawConfig.offlineMessage, 500);
  if (offlineMessage) {
    overrides.offlineMessage = offlineMessage;
  }

  const language = normalizeLanguage(rawConfig.language);
  if (language) {
    overrides.language = language;
  }

  return overrides;
}

export function normalizeWebchatCustomizationContract(
  rawConfig?: Record<string, unknown> | null,
  defaults?: WebchatCustomizationOverrides
): WebchatCustomizationContract {
  const mergedDefaults: WebchatCustomizationContract = {
    ...WEBCHAT_CUSTOMIZATION_DEFAULTS,
    ...normalizeWebchatCustomizationOverrides(defaults as Record<string, unknown> | undefined),
  };

  const overrides = normalizeWebchatCustomizationOverrides(rawConfig);

  return {
    welcomeMessage: overrides.welcomeMessage ?? mergedDefaults.welcomeMessage,
    brandColor: overrides.brandColor ?? mergedDefaults.brandColor,
    position: overrides.position ?? mergedDefaults.position,
    collectContactInfo: overrides.collectContactInfo ?? mergedDefaults.collectContactInfo,
    bubbleText: overrides.bubbleText ?? mergedDefaults.bubbleText,
    offlineMessage: overrides.offlineMessage ?? mergedDefaults.offlineMessage,
    language: overrides.language ?? mergedDefaults.language,
  };
}
