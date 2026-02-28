/**
 * Provider-agnostic integration endpoint contracts.
 *
 * Unified ingress paths are stable while tenant routing and provider adapters evolve.
 */

export type IntegrationProvider = "slack" | "google" | "microsoft";

export interface IntegrationEndpointBundle {
  oauthCallbackUrl: string;
  eventsUrl?: string;
  commandsUrl?: string;
  interactivityUrl?: string;
}

export interface ResolveIntegrationEndpointsArgs {
  provider: IntegrationProvider;
  apiBaseUrl: string;
  ingressBaseUrl?: string;
}

export function normalizeIntegrationBaseUrl(
  rawValue: string | undefined
): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return undefined;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export function toConvexSiteBaseUrl(rawValue: string | undefined): string | undefined {
  const baseUrl = normalizeIntegrationBaseUrl(rawValue);
  if (!baseUrl) {
    return undefined;
  }
  return baseUrl.replace(".convex.cloud", ".convex.site");
}

function joinIntegrationPath(baseUrl: string, path: string): string {
  return new URL(path, `${baseUrl}/`).toString();
}

export function resolveIntegrationEndpoints(
  args: ResolveIntegrationEndpointsArgs
): IntegrationEndpointBundle {
  const normalizedApiBaseUrl = normalizeIntegrationBaseUrl(args.apiBaseUrl);
  if (!normalizedApiBaseUrl) {
    throw new Error("Integration endpoint resolution requires a valid apiBaseUrl");
  }

  const normalizedIngressBaseUrl =
    normalizeIntegrationBaseUrl(args.ingressBaseUrl) || normalizedApiBaseUrl;

  if (args.provider === "slack") {
    return {
      oauthCallbackUrl: joinIntegrationPath(
        normalizedApiBaseUrl,
        "/integrations/slack/oauth/callback"
      ),
      eventsUrl: joinIntegrationPath(
        normalizedIngressBaseUrl,
        "/integrations/slack/events"
      ),
      commandsUrl: joinIntegrationPath(
        normalizedIngressBaseUrl,
        "/integrations/slack/commands"
      ),
      interactivityUrl: joinIntegrationPath(
        normalizedIngressBaseUrl,
        "/integrations/slack/interactivity"
      ),
    };
  }

  throw new Error(`Unsupported integration provider: ${args.provider}`);
}

