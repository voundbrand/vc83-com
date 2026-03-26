import {
  SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
  resolveAgentRuntimeModuleMetadataFromConfig,
} from "../../agentSpecRegistry";
import {
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING,
  SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND,
  type SamanthaAuditRoutingAuditChannel,
  type SamanthaAuditSourceContext,
} from "../../samanthaAuditContract";
import type { AgentToolResult } from "../../agentToolOrchestration";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

export function isSamanthaLeadCaptureRuntime(
  config: Record<string, unknown> | null | undefined,
): boolean {
  const runtimeModule = resolveAgentRuntimeModuleMetadataFromConfig(config);
  return runtimeModule?.key === SAMANTHA_AGENT_RUNTIME_MODULE_KEY;
}

export function resolveSamanthaRoutingAgentSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent: any,
): {
  agentId: string | null;
  displayName: string | null;
  templateRole: string | null;
  subtype: string | null;
  runtimeModuleKey: string | null;
  isSamanthaRuntime: boolean;
} {
  if (!agent || typeof agent !== "object") {
    return {
      agentId: null,
      displayName: null,
      templateRole: null,
      subtype: null,
      runtimeModuleKey: null,
      isSamanthaRuntime: false,
    };
  }
  const customProperties =
    agent.customProperties && typeof agent.customProperties === "object"
      ? (agent.customProperties as Record<string, unknown>)
      : undefined;
  const displayName =
    normalizeOptionalString(customProperties?.displayName)
    || normalizeOptionalString(agent.name)
    || null;
  const templateRole = normalizeOptionalString(customProperties?.templateRole);
  const runtimeModule = resolveAgentRuntimeModuleMetadataFromConfig(customProperties);
  return {
    agentId: normalizeOptionalString(agent._id),
    displayName,
    templateRole,
    subtype: normalizeOptionalString(agent.subtype),
    runtimeModuleKey: runtimeModule?.key ?? null,
    isSamanthaRuntime: isSamanthaLeadCaptureRuntime(customProperties),
  };
}

function normalizeSamanthaAuditRoutingChannel(
  value: unknown,
): SamanthaAuditRoutingAuditChannel | undefined {
  if (value === "webchat" || value === "native_guest") {
    return value;
  }
  return undefined;
}

export function resolveSamanthaAuditSourceContext(args: {
  ingressChannel: string;
  externalContactIdentifier: string;
  metadata: Record<string, unknown>;
}): SamanthaAuditSourceContext {
  const sourceContextRecord =
    args.metadata.sourceAuditContext
    && typeof args.metadata.sourceAuditContext === "object"
    && !Array.isArray(args.metadata.sourceAuditContext)
      ? (args.metadata.sourceAuditContext as Record<string, unknown>)
      : {};
  const ingressChannel = firstNonEmptyString(
    sourceContextRecord.ingressChannel,
    args.metadata.ingressChannel,
    args.metadata.sourceIngressChannel,
    args.metadata.originChannel,
    args.ingressChannel,
  ) || "unknown";
  const sourceSessionToken = firstNonEmptyString(
    sourceContextRecord.sourceSessionToken,
    args.metadata.sourceSessionToken,
    args.metadata.auditSourceSessionToken,
    args.metadata.sourceAuditSessionToken,
    args.metadata.auditSessionToken,
    args.metadata.sourceSessionId,
    args.metadata.originSessionToken,
    args.metadata.originSessionId,
  ) || (
    normalizeSamanthaAuditRoutingChannel(ingressChannel)
      ? firstNonEmptyString(args.externalContactIdentifier)
      : undefined
  );
  const sourceAuditChannel = normalizeSamanthaAuditRoutingChannel(
    firstNonEmptyString(
      sourceContextRecord.sourceAuditChannel,
      args.metadata.sourceAuditChannel,
      args.metadata.auditChannel,
    ) || normalizeSamanthaAuditRoutingChannel(args.ingressChannel),
  );
  const originSurface = firstNonEmptyString(
    sourceContextRecord.originSurface,
    args.metadata.originSurface,
    args.metadata.sourceSurface,
    args.metadata.screen,
    args.metadata.appScreen,
  );

  return {
    ingressChannel,
    originSurface: originSurface || undefined,
    sourceSessionToken: sourceSessionToken || undefined,
    sourceAuditChannel,
  };
}

export function resolveSamanthaAuditLookupTarget(
  sourceContext: SamanthaAuditSourceContext,
):
  | {
      ok: true;
      channel: SamanthaAuditRoutingAuditChannel;
      sessionToken: string;
    }
  | {
      ok: false;
      errorCode: typeof SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING;
      message: string;
    } {
  const sourceSessionToken = normalizeOptionalString(sourceContext.sourceSessionToken);
  if (!sourceSessionToken) {
    return {
      ok: false,
      errorCode: SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING,
      message:
        "Missing audit session context. Provide sourceSessionToken and sourceAuditChannel from the originating channel.",
    };
  }
  const sourceAuditChannel = normalizeSamanthaAuditRoutingChannel(sourceContext.sourceAuditChannel);
  if (sourceAuditChannel) {
    return {
      ok: true,
      channel: sourceAuditChannel,
      sessionToken: sourceSessionToken,
    };
  }
  const ingressAuditChannel = normalizeSamanthaAuditRoutingChannel(sourceContext.ingressChannel);
  if (ingressAuditChannel) {
    return {
      ok: true,
      channel: ingressAuditChannel,
      sessionToken: sourceSessionToken,
    };
  }
  return {
    ok: false,
    errorCode: SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING,
    message:
      "Missing audit session context. Ingress channel is not routable for audit lookup without sourceAuditChannel.",
  };
}

export function resolveSamanthaAuditSessionContextFailure(
  toolResults: AgentToolResult[],
):
  | typeof SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING
  | typeof SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND
  | null {
  for (const result of toolResults) {
    if (normalizeOptionalString(result.tool) !== AUDIT_DELIVERABLE_TOOL_NAME) {
      continue;
    }
    if (result.status === "success") {
      return null;
    }
    const payload =
      result.result && typeof result.result === "object" && !Array.isArray(result.result)
        ? (result.result as Record<string, unknown>)
        : {};
    const toolErrorCode = normalizeOptionalString(
      firstNonEmptyString(payload.error, payload.errorCode),
    );
    if (toolErrorCode === SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING) {
      return SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_MISSING;
    }
    if (toolErrorCode === SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND) {
      return SAMANTHA_AUDIT_SESSION_CONTEXT_ERROR_NOT_FOUND;
    }
  }
  return null;
}
