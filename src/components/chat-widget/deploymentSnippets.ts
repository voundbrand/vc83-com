import {
  WEBCHAT_CUSTOMIZATION_FIELDS,
  normalizeWebchatCustomizationContract,
  normalizeWebchatCustomizationOverrides,
  type PublicInboundChannel,
  type WebchatCustomizationContract,
  type WebchatCustomizationOverrides,
  type WebchatWidgetPosition,
} from "../../../convex/webchatCustomizationContractCore";

export interface WebchatSnippetBootstrapContract {
  contractVersion: string;
  resolvedAt: number;
  channel: PublicInboundChannel;
  organizationId: string;
  agentId: string;
  config: {
    agentId: string;
    agentName: string;
    avatar?: string;
  } & WebchatCustomizationContract;
  deploymentDefaults: {
    snippetMode: "script";
    iframe: {
      width: number;
      height: number;
      offsetPx: number;
      position: WebchatWidgetPosition;
    };
  };
}

export interface WebchatSnippetGenerationOptions {
  appBaseUrl: string;
  apiUrl?: string;
  scriptPath?: string;
  iframePathTemplate?: string;
}

export interface WebchatRuntimeSeed {
  agentId?: string;
  apiUrl?: string;
  channel?: PublicInboundChannel;
  customization?: WebchatCustomizationOverrides;
}

export interface WebchatDeploymentSnippets {
  script: string;
  react: string;
  iframe: string;
  runtimeSeed: Required<Omit<WebchatRuntimeSeed, "customization">> & {
    customization: WebchatCustomizationContract;
  };
}

const DATA_ATTRIBUTE_FIELD_NAMES: Record<
  (typeof WEBCHAT_CUSTOMIZATION_FIELDS)[number],
  string
> = {
  welcomeMessage: "data-welcome-message",
  brandColor: "data-brand-color",
  position: "data-position",
  collectContactInfo: "data-collect-contact-info",
  bubbleText: "data-bubble-text",
  offlineMessage: "data-offline-message",
  language: "data-language",
};

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }
  return stripTrailingSlash(trimmed);
}

function resolveApiUrl(appBaseUrl: string, explicitApiUrl?: string): string {
  if (typeof explicitApiUrl === "string" && explicitApiUrl.trim().length > 0) {
    return stripTrailingSlash(explicitApiUrl.trim());
  }
  return `${appBaseUrl}/api/v1`;
}

function resolveScriptSrc(appBaseUrl: string, explicitPath?: string): string {
  const scriptPath = explicitPath && explicitPath.trim().length > 0 ? explicitPath.trim() : "/widget.js";
  if (scriptPath.startsWith("http://") || scriptPath.startsWith("https://")) {
    return stripTrailingSlash(scriptPath);
  }
  const normalizedPath = scriptPath.startsWith("/") ? scriptPath : `/${scriptPath}`;
  return `${appBaseUrl}${normalizedPath}`;
}

function resolveIframePath(agentId: string, template?: string): string {
  if (!template || template.trim().length === 0) {
    return `/chat/${encodeURIComponent(agentId)}`;
  }

  const normalizedTemplate = template.trim();
  const withAgentId = normalizedTemplate
    .replace(/\{agentId\}/g, encodeURIComponent(agentId))
    .replace(/:agentId/g, encodeURIComponent(agentId));

  if (withAgentId.startsWith("/")) {
    return withAgentId;
  }
  return `/${withAgentId}`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeReactString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

function parseBoolean(value: string | null | undefined): boolean | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const lowered = value.trim().toLowerCase();
  if (lowered === "true" || lowered === "1") {
    return true;
  }
  if (lowered === "false" || lowered === "0") {
    return false;
  }
  return undefined;
}

function parseChannel(value: string | null | undefined): PublicInboundChannel | undefined {
  if (value === "webchat" || value === "native_guest") {
    return value;
  }
  return undefined;
}

function formatCustomizationValue(
  field: (typeof WEBCHAT_CUSTOMIZATION_FIELDS)[number],
  customization: WebchatCustomizationContract
): string {
  if (field === "collectContactInfo") {
    return customization.collectContactInfo ? "true" : "false";
  }
  return String(customization[field]);
}

function buildIframeStyle(
  defaults: WebchatSnippetBootstrapContract["deploymentDefaults"]["iframe"]
): string {
  const width = Number.isFinite(defaults.width) && defaults.width > 0 ? Math.round(defaults.width) : 400;
  const height = Number.isFinite(defaults.height) && defaults.height > 0 ? Math.round(defaults.height) : 600;
  const offset = Number.isFinite(defaults.offsetPx) && defaults.offsetPx >= 0 ? Math.round(defaults.offsetPx) : 20;
  const anchor = defaults.position === "bottom-left" ? "left" : "right";

  return `position:fixed;bottom:${offset}px;${anchor}:${offset}px;width:${width}px;height:${height}px;border:none;z-index:9999;`;
}

function buildIframeSrc(
  appBaseUrl: string,
  contract: WebchatSnippetBootstrapContract,
  apiUrl: string,
  customization: WebchatCustomizationContract,
  template?: string
): string {
  const iframePath = resolveIframePath(contract.agentId, template);
  const iframeUrl = new URL(`${appBaseUrl}${iframePath}`);
  const params = new URLSearchParams();

  params.set("agentId", contract.agentId);
  params.set("apiUrl", apiUrl);
  params.set("channel", contract.channel);

  for (const field of WEBCHAT_CUSTOMIZATION_FIELDS) {
    params.set(field, formatCustomizationValue(field, customization));
  }

  iframeUrl.search = params.toString();
  return iframeUrl.toString();
}

export function generateWebchatDeploymentSnippets(
  contract: WebchatSnippetBootstrapContract,
  options: WebchatSnippetGenerationOptions
): WebchatDeploymentSnippets {
  const appBaseUrl = resolveBaseUrl(options.appBaseUrl);
  if (!appBaseUrl) {
    throw new Error("appBaseUrl is required to generate snippets");
  }

  const customization = normalizeWebchatCustomizationContract(
    contract.config as unknown as Record<string, unknown>
  );
  const apiUrl = resolveApiUrl(appBaseUrl, options.apiUrl);
  const scriptSrc = resolveScriptSrc(appBaseUrl, options.scriptPath);
  const iframeSrc = buildIframeSrc(
    appBaseUrl,
    contract,
    apiUrl,
    customization,
    options.iframePathTemplate
  );

  const scriptLines = [
    "<script",
    `  src="${escapeHtmlAttribute(scriptSrc)}"`,
    `  data-agent-id="${escapeHtmlAttribute(contract.agentId)}"`,
    `  data-api-url="${escapeHtmlAttribute(apiUrl)}"`,
    `  data-channel="${contract.channel}"`,
  ];

  for (const field of WEBCHAT_CUSTOMIZATION_FIELDS) {
    scriptLines.push(
      `  ${DATA_ATTRIBUTE_FIELD_NAMES[field]}="${escapeHtmlAttribute(
        formatCustomizationValue(field, customization)
      )}"`
    );
  }

  scriptLines.push("></script>");

  const reactLines = [
    'import { ChatWidget } from "@l4yercak3/webchat";',
    "",
    "<ChatWidget",
    `  agentId=\"${escapeReactString(contract.agentId)}\"`,
    `  apiUrl=\"${escapeReactString(apiUrl)}\"`,
    `  channel=\"${contract.channel}\"`,
    "  customization={{",
  ];

  for (const field of WEBCHAT_CUSTOMIZATION_FIELDS) {
    if (field === "collectContactInfo") {
      reactLines.push(`    ${field}: ${customization.collectContactInfo ? "true" : "false"},`);
    } else {
      reactLines.push(
        `    ${field}: \"${escapeReactString(String(customization[field]))}\",`
      );
    }
  }

  reactLines.push("  }}");
  reactLines.push("/>");

  const iframeStyle = buildIframeStyle(contract.deploymentDefaults.iframe);
  const iframeLines = [
    `<iframe src=\"${escapeHtmlAttribute(iframeSrc)}\"`,
    `  style=\"${escapeHtmlAttribute(iframeStyle)}\"`,
    `  title=\"${escapeHtmlAttribute(contract.config.agentName)} webchat\"`,
    "  loading=\"lazy\"",
    "  allow=\"clipboard-write\"",
    "></iframe>",
  ];

  return {
    script: scriptLines.join("\n"),
    react: reactLines.join("\n"),
    iframe: iframeLines.join("\n"),
    runtimeSeed: {
      agentId: contract.agentId,
      apiUrl,
      channel: contract.channel,
      customization,
    },
  };
}

function toRecord(input: Record<string, string | undefined>): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      record[key] = value;
    }
  }
  return record;
}

function getValue(
  record: Record<string, string | undefined>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

export function parseWebchatSnippetRuntimeSeedFromDataset(
  dataset: Record<string, string | undefined>
): WebchatRuntimeSeed {
  const channel = parseChannel(getValue(dataset, "channel", "data-channel"));
  const collectContactInfo = parseBoolean(
    getValue(dataset, "collectContactInfo", "collect-contact-info", "data-collect-contact-info")
  );

  const rawCustomization: Record<string, unknown> = {
    welcomeMessage: getValue(dataset, "welcomeMessage", "welcome-message", "data-welcome-message"),
    brandColor: getValue(dataset, "brandColor", "brand-color", "data-brand-color"),
    position: getValue(dataset, "position", "data-position"),
    bubbleText: getValue(dataset, "bubbleText", "bubble-text", "data-bubble-text"),
    offlineMessage: getValue(dataset, "offlineMessage", "offline-message", "data-offline-message"),
    language: getValue(dataset, "language", "data-language"),
    collectContactInfo,
  };

  return {
    agentId: getValue(dataset, "agentId", "agent-id", "data-agent-id"),
    apiUrl: getValue(dataset, "apiUrl", "api-url", "data-api-url"),
    channel,
    customization: normalizeWebchatCustomizationOverrides(rawCustomization),
  };
}

export function parseWebchatSnippetRuntimeSeedFromQuery(search: string): WebchatRuntimeSeed {
  if (!search || search.trim().length === 0) {
    return {};
  }

  const normalizedSearch = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);

  const record: Record<string, string | undefined> = {};
  for (const [key, value] of params.entries()) {
    record[key] = value;
  }

  const channel = parseChannel(record.channel);
  const collectContactInfo = parseBoolean(record.collectContactInfo);
  const rawCustomization = toRecord({
    welcomeMessage: record.welcomeMessage,
    brandColor: record.brandColor,
    position: record.position,
    bubbleText: record.bubbleText,
    offlineMessage: record.offlineMessage,
    language: record.language,
    collectContactInfo:
      typeof collectContactInfo === "boolean"
        ? collectContactInfo
          ? "true"
          : "false"
        : undefined,
  });

  return {
    agentId: record.agentId,
    apiUrl: record.apiUrl,
    channel,
    customization: normalizeWebchatCustomizationOverrides({
      ...rawCustomization,
      ...(typeof collectContactInfo === "boolean"
        ? { collectContactInfo }
        : {}),
    }),
  };
}
