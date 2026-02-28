import type { Id } from "../../_generated/dataModel";
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  type TrustEventPayload,
  type TrustEventSchemaValidationStatus,
  validateTrustEventPayload,
} from "../trustEvents";
import {
  shouldRequireToolApproval,
  type ToolApprovalAutonomyLevel,
} from "../escalation";
import type { AITool, ToolExecutionContext } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

export const CODE_EXECUTION_TOOL_NAME = "execute_code";
export const CODE_EXECUTION_POLICY_TYPE = "code_execution_governance";
export const CODE_EXECUTION_POLICY_VERSION = "code_execution_governance.v1";
export const CODE_EXECUTION_SANDBOX_PROFILE = "bounded_vm.v1";
export const CODE_EXECUTION_NETWORK_EGRESS = "blocked";

export const CODE_EXECUTION_TRUST_EVENT_NAMES = [
  "trust.guardrail.code_execution_requested.v1",
  "trust.guardrail.code_execution_allowed.v1",
  "trust.guardrail.code_execution_blocked.v1",
  "trust.guardrail.code_execution_outcome.v1",
] as const;

export type CodeExecutionTrustEventName =
  (typeof CODE_EXECUTION_TRUST_EVENT_NAMES)[number];

export type CodeExecutionAutonomyLevel = ToolApprovalAutonomyLevel;

export interface CodeExecutionRuntimePolicy {
  autonomyLevel?: CodeExecutionAutonomyLevel;
  requireApprovalFor?: string[];
  approvalRequired?: boolean;
  approvalGranted?: boolean;
  approvalId?: string;
  policySource?: string;
}

interface CodeExecutionGovernanceDecision {
  allow: boolean;
  reason:
    | "policy_missing"
    | "autonomy_missing"
    | "sandbox_autonomy_block"
    | "approval_required"
    | "approval_missing"
    | "policy_allow";
  autonomyLevel: CodeExecutionAutonomyLevel | "unknown";
  requiresApproval: boolean;
  approvalGranted: boolean;
  approvalId: string;
}

export interface CodeExecutionSourceGuardResult {
  allowed: boolean;
  reason?: "source_empty" | "source_too_large" | "forbidden_pattern_detected";
  pattern?: string;
}

export function normalizeCodeExecutionPolicy(
  value: unknown,
): CodeExecutionRuntimePolicy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const autonomyLevel = normalizeAutonomyLevel(record.autonomyLevel);
  const requireApprovalFor = Array.isArray(record.requireApprovalFor)
    ? Array.from(
        new Set(
          record.requireApprovalFor
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
        ),
      )
    : undefined;

  const approvalId =
    typeof record.approvalId === "string" && record.approvalId.trim().length > 0
      ? record.approvalId.trim()
      : undefined;

  const policySource =
    typeof record.policySource === "string" && record.policySource.trim().length > 0
      ? record.policySource.trim()
      : undefined;

  return {
    autonomyLevel: autonomyLevel ?? undefined,
    requireApprovalFor,
    approvalRequired: record.approvalRequired === true,
    approvalGranted: record.approvalGranted === true,
    approvalId,
    policySource,
  };
}

function normalizeAutonomyLevel(
  value: unknown,
): CodeExecutionAutonomyLevel | null {
  if (typeof value !== "string") {
    return null;
  }
  if (
    value === "supervised"
    || value === "sandbox"
    || value === "autonomous"
    || value === "delegation"
    || value === "draft_only"
  ) {
    return value;
  }
  return null;
}

export function resolveCodeExecutionGovernanceDecision(args: {
  policy: CodeExecutionRuntimePolicy | null;
}): CodeExecutionGovernanceDecision {
  if (!args.policy) {
    return {
      allow: false,
      reason: "policy_missing",
      autonomyLevel: "unknown",
      requiresApproval: true,
      approvalGranted: false,
      approvalId: "none",
    };
  }

  const autonomyLevel = args.policy.autonomyLevel;
  if (!autonomyLevel) {
    return {
      allow: false,
      reason: "autonomy_missing",
      autonomyLevel: "unknown",
      requiresApproval: true,
      approvalGranted: false,
      approvalId: "none",
    };
  }

  if (autonomyLevel === "sandbox" || autonomyLevel === "draft_only") {
    return {
      allow: false,
      reason: "sandbox_autonomy_block",
      autonomyLevel,
      requiresApproval: false,
      approvalGranted: false,
      approvalId: "none",
    };
  }

  const requiresApprovalByPolicy = shouldRequireToolApproval({
    autonomyLevel,
    toolName: CODE_EXECUTION_TOOL_NAME,
    requireApprovalFor: args.policy.requireApprovalFor,
  });
  const requiresApproval = args.policy.approvalRequired === true || requiresApprovalByPolicy;
  const approvalGranted = args.policy.approvalGranted === true;

  if (requiresApproval && !approvalGranted) {
    return {
      allow: false,
      reason: args.policy.approvalRequired === true
        ? "approval_missing"
        : "approval_required",
      autonomyLevel,
      requiresApproval,
      approvalGranted,
      approvalId: args.policy.approvalId || "none",
    };
  }

  return {
    allow: true,
    reason: "policy_allow",
    autonomyLevel,
    requiresApproval,
    approvalGranted,
    approvalId: args.policy.approvalId || "none",
  };
}

const MAX_SOURCE_CODE_CHARS = 8_000;
const DEFAULT_TIMEOUT_MS = 400;
const MAX_TIMEOUT_MS = 2_000;
const MIN_TIMEOUT_MS = 50;

interface CodeExecutionSourceFingerprint {
  sourceHash: string;
  sourceBytes: number;
}

interface CodeExecutionNodeExecutionResult {
  result: unknown;
  resultBytes: number;
  resultTruncated: boolean;
}

const FORBIDDEN_SOURCE_PATTERNS: Array<{ pattern: RegExp; token: string }> = [
  { pattern: /\bfetch\s*\(/i, token: "fetch" },
  { pattern: /\bXMLHttpRequest\b/i, token: "XMLHttpRequest" },
  { pattern: /\bWebSocket\b/i, token: "WebSocket" },
  { pattern: /\bEventSource\b/i, token: "EventSource" },
  { pattern: /\brequire\s*\(/i, token: "require" },
  { pattern: /\bimport\s*\(/i, token: "dynamic_import" },
  { pattern: /\bprocess\b/i, token: "process" },
  { pattern: /\bglobal\b/i, token: "global" },
  { pattern: /\bglobalThis\b/i, token: "globalThis" },
  { pattern: /\bBuffer\b/i, token: "Buffer" },
  { pattern: /\bchild_process\b/i, token: "child_process" },
  { pattern: /\bfs\b/i, token: "fs" },
  { pattern: /\bhttp\b/i, token: "http" },
  { pattern: /\bhttps\b/i, token: "https" },
  { pattern: /\bdns\b/i, token: "dns" },
  { pattern: /\bnet\b/i, token: "net" },
  { pattern: /\btls\b/i, token: "tls" },
  { pattern: /\bDeno\b/i, token: "Deno" },
  { pattern: /\bBun\b/i, token: "Bun" },
  { pattern: /\bFunction\b/i, token: "Function" },
  { pattern: /\beval\s*\(/i, token: "eval" },
];

function clampTimeoutMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_TIMEOUT_MS;
  }
  const rounded = Math.floor(value);
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, rounded));
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function resolveCodeExecutionSourceFingerprint(args: {
  ctx: ToolExecutionContext;
  sourceCode: string;
}): Promise<CodeExecutionSourceFingerprint> {
  const fallback: CodeExecutionSourceFingerprint = {
    sourceHash: "unhashed",
    sourceBytes: args.sourceCode.length,
  };
  try {
    const fingerprint = await args.ctx.runAction(
      getInternal().ai.tools.codeExecutionNodeRuntime.computeSourceFingerprint,
      { sourceCode: args.sourceCode },
    ) as Partial<CodeExecutionSourceFingerprint> | null;
    if (
      fingerprint
      && typeof fingerprint.sourceHash === "string"
      && typeof fingerprint.sourceBytes === "number"
      && Number.isFinite(fingerprint.sourceBytes)
    ) {
      return {
        sourceHash: fingerprint.sourceHash,
        sourceBytes: Math.max(0, Math.floor(fingerprint.sourceBytes)),
      };
    }
  } catch (error) {
    console.warn("[codeExecutionTool] Unable to compute source fingerprint in node runtime", error);
  }
  return fallback;
}

export function guardCodeExecutionSource(sourceCode: unknown):
  CodeExecutionSourceGuardResult {
  const source = normalizeNonEmptyString(sourceCode);
  if (!source) {
    return {
      allowed: false,
      reason: "source_empty",
    };
  }

  if (source.length > MAX_SOURCE_CODE_CHARS) {
    return {
      allowed: false,
      reason: "source_too_large",
    };
  }

  for (const entry of FORBIDDEN_SOURCE_PATTERNS) {
    if (entry.pattern.test(source)) {
      return {
        allowed: false,
        reason: "forbidden_pattern_detected",
        pattern: entry.token,
      };
    }
  }

  return {
    allowed: true,
  };
}

export const recordCodeExecutionTrustEvent = internalMutation({
  args: {
    eventName: v.union(
      v.literal("trust.guardrail.code_execution_requested.v1"),
      v.literal("trust.guardrail.code_execution_allowed.v1"),
      v.literal("trust.guardrail.code_execution_blocked.v1"),
      v.literal("trust.guardrail.code_execution_outcome.v1"),
    ),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as TrustEventPayload;
    const validation = validateTrustEventPayload(args.eventName, payload);
    await ctx.db.insert("aiTrustEvents", {
      event_name: args.eventName,
      payload,
      schema_validation_status: validation.ok
        ? "passed"
        : "failed" as TrustEventSchemaValidationStatus,
      schema_errors: validation.ok ? undefined : validation.errors,
      created_at: Date.now(),
    });
  },
});

function resolveTrustActor(
  ctx: ToolExecutionContext,
): { actorType: "agent" | "user"; actorId: string } {
  if (ctx.agentId) {
    return {
      actorType: "agent",
      actorId: String(ctx.agentId),
    };
  }
  return {
    actorType: "user",
    actorId: String(ctx.userId),
  };
}

function resolveTrustSessionId(ctx: ToolExecutionContext): string {
  if (ctx.agentSessionId) {
    return String(ctx.agentSessionId);
  }
  if (ctx.conversationId) {
    return String(ctx.conversationId);
  }
  if (ctx.sessionId) {
    return String(ctx.sessionId);
  }
  return `code-exec:${String(ctx.userId)}`;
}

function resolveTrustChannel(ctx: ToolExecutionContext): string {
  return (
    ctx.runtimePolicy?.ingressEnvelope?.channel
    || ctx.channel
    || "runtime"
  );
}

function buildTrustPayload(args: {
  ctx: ToolExecutionContext;
  eventName: CodeExecutionTrustEventName;
  requestId: string;
  occurredAt: number;
  governance: CodeExecutionGovernanceDecision;
  enforcementDecision: string;
  executionOutcome: string;
  failureReason?: string;
  durationMs?: number;
  timeoutMs: number;
  sourceHash: string;
  sourceBytes: number;
}): TrustEventPayload {
  const trustActor = resolveTrustActor(args.ctx);
  return {
    event_id: `${args.eventName}:${args.requestId}:${args.occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: args.occurredAt,
    org_id: args.ctx.organizationId,
    mode: "runtime",
    channel: resolveTrustChannel(args.ctx),
    session_id: resolveTrustSessionId(args.ctx),
    actor_type: trustActor.actorType,
    actor_id: trustActor.actorId,
    policy_type: CODE_EXECUTION_POLICY_TYPE,
    policy_id: CODE_EXECUTION_POLICY_VERSION,
    tool_name: CODE_EXECUTION_TOOL_NAME,
    enforcement_decision: args.enforcementDecision,
    autonomy_domain: "code_execution",
    autonomy_level_from: args.governance.autonomyLevel,
    autonomy_level_to: args.governance.autonomyLevel,
    decision_reason: args.governance.reason,
    execution_request_id: args.requestId,
    sandbox_profile: CODE_EXECUTION_SANDBOX_PROFILE,
    network_egress: CODE_EXECUTION_NETWORK_EGRESS,
    approval_id: args.governance.approvalId,
    execution_outcome: args.executionOutcome,
    execution_duration_ms: args.durationMs,
    execution_timeout_ms: args.timeoutMs,
    execution_source_hash: args.sourceHash,
    execution_source_bytes: args.sourceBytes,
    failure_reason: args.failureReason,
    approval_required: args.governance.requiresApproval ? "required" : "not_required",
    approval_status: args.governance.approvalGranted ? "granted" : "not_granted",
  };
}

async function emitCodeExecutionTrustEvent(args: {
  ctx: ToolExecutionContext;
  eventName: CodeExecutionTrustEventName;
  requestId: string;
  governance: CodeExecutionGovernanceDecision;
  enforcementDecision: string;
  executionOutcome: string;
  failureReason?: string;
  durationMs?: number;
  timeoutMs: number;
  sourceHash: string;
  sourceBytes: number;
  occurredAt?: number;
}): Promise<void> {
  const occurredAt = args.occurredAt ?? Date.now();
  const payload = buildTrustPayload({
    ctx: args.ctx,
    eventName: args.eventName,
    requestId: args.requestId,
    occurredAt,
    governance: args.governance,
    enforcementDecision: args.enforcementDecision,
    executionOutcome: args.executionOutcome,
    failureReason: args.failureReason,
    durationMs: args.durationMs,
    timeoutMs: args.timeoutMs,
    sourceHash: args.sourceHash,
    sourceBytes: args.sourceBytes,
  });

  await args.ctx.runMutation(
    getInternal().ai.tools.codeExecutionTool.recordCodeExecutionTrustEvent,
    {
      eventName: args.eventName,
      payload,
    },
  );
}

async function executeSandboxedJavaScriptInNodeRuntime(args: {
  ctx: ToolExecutionContext;
  sourceCode: string;
  input: unknown;
  timeoutMs: number;
}): Promise<CodeExecutionNodeExecutionResult> {
  const result = await args.ctx.runAction(
    getInternal().ai.tools.codeExecutionNodeRuntime.executeSandboxedJavaScript,
    {
      sourceCode: args.sourceCode,
      input: args.input,
      timeoutMs: args.timeoutMs,
    },
  ) as Partial<CodeExecutionNodeExecutionResult> | null;
  if (
    !result
    || typeof result.resultBytes !== "number"
    || !Number.isFinite(result.resultBytes)
    || typeof result.resultTruncated !== "boolean"
  ) {
    throw new Error("Invalid code execution runtime response");
  }
  return {
    result: result.result,
    resultBytes: Math.max(0, Math.floor(result.resultBytes)),
    resultTruncated: result.resultTruncated,
  };
}

export const executeCodeTool: AITool = {
  name: CODE_EXECUTION_TOOL_NAME,
  description:
    "Execute bounded JavaScript snippets inside a non-networked runtime sandbox. "
    + "Governance is fail-closed: sandbox autonomy is blocked and approval policy must be satisfied.",
  status: "ready",
  readOnly: false,
  parameters: {
    type: "object",
    properties: {
      sourceCode: {
        type: "string",
        description: "JavaScript snippet to execute in the bounded sandbox. Return a value from the snippet.",
      },
      input: {
        type: "object",
        description: "Optional JSON input object exposed as `input` inside the sandbox.",
      },
      timeoutMs: {
        type: "number",
        description: "Optional execution timeout in milliseconds (50-2000, default 400).",
      },
    },
    required: ["sourceCode"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      sourceCode: string;
      input?: unknown;
      timeoutMs?: number;
    },
  ) => {
    const sourceCode = normalizeNonEmptyString(args.sourceCode) ?? "";
    const timeoutMs = clampTimeoutMs(args.timeoutMs);
    const { sourceHash, sourceBytes } = await resolveCodeExecutionSourceFingerprint({
      ctx,
      sourceCode,
    });
    const requestId = `code-exec:${resolveTrustSessionId(ctx)}:${Date.now()}`;

    const policy = normalizeCodeExecutionPolicy(
      ctx.runtimePolicy?.codeExecution,
    );
    const governance = resolveCodeExecutionGovernanceDecision({
      policy,
    });

    await emitCodeExecutionTrustEvent({
      ctx,
      eventName: "trust.guardrail.code_execution_requested.v1",
      requestId,
      governance,
      enforcementDecision: "request_received",
      executionOutcome: "requested",
      timeoutMs,
      sourceHash,
      sourceBytes,
    });

    if (!governance.allow) {
      await emitCodeExecutionTrustEvent({
        ctx,
        eventName: "trust.guardrail.code_execution_blocked.v1",
        requestId,
        governance,
        enforcementDecision: "blocked",
        executionOutcome: "blocked",
        failureReason: governance.reason,
        timeoutMs,
        sourceHash,
        sourceBytes,
      });
      await emitCodeExecutionTrustEvent({
        ctx,
        eventName: "trust.guardrail.code_execution_outcome.v1",
        requestId,
        governance,
        enforcementDecision: "blocked",
        executionOutcome: "blocked",
        failureReason: governance.reason,
        timeoutMs,
        sourceHash,
        sourceBytes,
      });
      return {
        success: false,
        status: "blocked",
        tool: CODE_EXECUTION_TOOL_NAME,
        requestId,
        reason: governance.reason,
        governance: {
          autonomyLevel: governance.autonomyLevel,
          requiresApproval: governance.requiresApproval,
          approvalGranted: governance.approvalGranted,
          approvalId: governance.approvalId,
        },
      };
    }

    const sourceGuard = guardCodeExecutionSource(sourceCode);
    if (!sourceGuard.allowed) {
      const failureReason = sourceGuard.pattern
        ? `${sourceGuard.reason}:${sourceGuard.pattern}`
        : (sourceGuard.reason ?? "source_guard_blocked");
      await emitCodeExecutionTrustEvent({
        ctx,
        eventName: "trust.guardrail.code_execution_blocked.v1",
        requestId,
        governance,
        enforcementDecision: "blocked",
        executionOutcome: "blocked",
        failureReason,
        timeoutMs,
        sourceHash,
        sourceBytes,
      });
      await emitCodeExecutionTrustEvent({
        ctx,
        eventName: "trust.guardrail.code_execution_outcome.v1",
        requestId,
        governance,
        enforcementDecision: "blocked",
        executionOutcome: "blocked",
        failureReason,
        timeoutMs,
        sourceHash,
        sourceBytes,
      });
      return {
        success: false,
        status: "blocked",
        tool: CODE_EXECUTION_TOOL_NAME,
        requestId,
        reason: failureReason,
      };
    }

    await emitCodeExecutionTrustEvent({
      ctx,
      eventName: "trust.guardrail.code_execution_allowed.v1",
      requestId,
      governance,
      enforcementDecision: "allowed",
      executionOutcome: "allowed",
      timeoutMs,
      sourceHash,
      sourceBytes,
    });

    const startedAt = Date.now();
    try {
      const executionResult = await executeSandboxedJavaScriptInNodeRuntime({
        ctx,
        sourceCode,
        input: args.input,
        timeoutMs,
      });
      const durationMs = Date.now() - startedAt;

      await emitCodeExecutionTrustEvent({
        ctx,
        eventName: "trust.guardrail.code_execution_outcome.v1",
        requestId,
        governance,
        enforcementDecision: "allowed",
        executionOutcome: "success",
        durationMs,
        timeoutMs,
        sourceHash,
        sourceBytes,
      });

      return {
        success: true,
        status: "executed",
        tool: CODE_EXECUTION_TOOL_NAME,
        requestId,
        sandbox: {
          profile: CODE_EXECUTION_SANDBOX_PROFILE,
          networkEgress: CODE_EXECUTION_NETWORK_EGRESS,
          timeoutMs,
          sourceBytes,
          sourceHash,
          resultBytes: executionResult.resultBytes,
          resultTruncated: executionResult.resultTruncated,
        },
        result: executionResult.result,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const failureReason =
        error instanceof Error && typeof error.message === "string"
          ? error.message
          : String(error);

      await emitCodeExecutionTrustEvent({
        ctx,
        eventName: "trust.guardrail.code_execution_outcome.v1",
        requestId,
        governance,
        enforcementDecision: "allowed",
        executionOutcome: "error",
        failureReason,
        durationMs,
        timeoutMs,
        sourceHash,
        sourceBytes,
      });

      return {
        success: false,
        status: "error",
        tool: CODE_EXECUTION_TOOL_NAME,
        requestId,
        error: failureReason,
      };
    }
  },
};

export function buildCodeExecutionTrustSeed(args: {
  organizationId: Id<"organizations">;
  sessionId: string;
  actorId: string;
}) {
  return {
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    org_id: args.organizationId,
    mode: "runtime" as const,
    channel: "runtime",
    session_id: args.sessionId,
    actor_type: "system" as const,
    actor_id: args.actorId,
    policy_type: CODE_EXECUTION_POLICY_TYPE,
    policy_id: CODE_EXECUTION_POLICY_VERSION,
    tool_name: CODE_EXECUTION_TOOL_NAME,
    autonomy_domain: "code_execution",
    autonomy_level_from: "autonomous",
    autonomy_level_to: "autonomous",
    decision_reason: "policy_allow",
    execution_request_id: "req_001",
    sandbox_profile: CODE_EXECUTION_SANDBOX_PROFILE,
    network_egress: CODE_EXECUTION_NETWORK_EGRESS,
    approval_id: "none",
    execution_outcome: "requested",
    execution_source_hash: "hash",
    execution_source_bytes: 1,
    approval_required: "not_required",
    approval_status: "not_granted",
  };
}
