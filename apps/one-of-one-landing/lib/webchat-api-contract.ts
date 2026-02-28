import {
  WEBCHAT_BOOTSTRAP_CONTRACT_VERSION,
  type PublicInboundChannel,
  type WebchatCustomizationContract,
  type WebchatWidgetPosition,
} from "../../../convex/webchatCustomizationContractCore";

export type LandingAuditChannel = PublicInboundChannel;

export interface LandingWebchatConfigContract extends WebchatCustomizationContract {
  agentId: string;
  agentName: string;
  avatar?: string;
}

export interface LandingWebchatBootstrapContract {
  contractVersion: string;
  resolvedAt: number;
  channel: LandingAuditChannel;
  organizationId: string;
  agentId: string;
  config: LandingWebchatConfigContract;
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

export interface LandingWebchatConfigResponse extends LandingWebchatConfigContract {
  channel: LandingAuditChannel;
  contractVersion: string;
  customizationFields: readonly string[];
}

export function normalizeLandingAuditChannel(channel?: string): LandingAuditChannel {
  return channel === "native_guest" ? "native_guest" : "webchat";
}

export function buildWebchatBootstrapUrl(args: {
  apiBaseUrl: string;
  agentId: string;
  channel?: LandingAuditChannel;
}): string {
  const base = args.apiBaseUrl.replace(/\/+$/, "");
  const channel = normalizeLandingAuditChannel(args.channel);
  return `${base}/api/v1/webchat/bootstrap/${encodeURIComponent(args.agentId)}?channel=${channel}`;
}

export function buildWebchatConfigUrl(args: {
  apiBaseUrl: string;
  agentId: string;
  channel?: LandingAuditChannel;
}): string {
  const base = args.apiBaseUrl.replace(/\/+$/, "");
  const channel = normalizeLandingAuditChannel(args.channel);
  return `${base}/api/v1/webchat/config/${encodeURIComponent(args.agentId)}?channel=${channel}`;
}

export function isLandingWebchatBootstrapContract(
  value: unknown
): value is LandingWebchatBootstrapContract {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.contractVersion === "string"
    && typeof candidate.agentId === "string"
    && typeof candidate.organizationId === "string"
    && (candidate.channel === "webchat" || candidate.channel === "native_guest")
  );
}

export function assertBootstrapContractVersion(contractVersion: string): boolean {
  return contractVersion === WEBCHAT_BOOTSTRAP_CONTRACT_VERSION;
}
