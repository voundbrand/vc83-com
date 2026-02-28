/* eslint-disable no-console */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const agentExecutionModule = require("../../convex/ai/agentExecution.ts");
const handler = (agentExecutionModule as any).processInboundMessage._handler as (
  ctx: any,
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>;

process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test_openrouter_key";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test_openai_key";

const nativeConsoleLog = console.log.bind(console);
const isPerfLine = (value: unknown): boolean =>
  typeof value === "string" && value.startsWith("[PERF]");

console.log = (...args: unknown[]) => {
  if (isPerfLine(args[0])) {
    nativeConsoleLog(...args);
  }
};
console.info = (...args: unknown[]) => {
  if (isPerfLine(args[0])) {
    nativeConsoleLog(...args);
  }
};
console.warn = (...args: unknown[]) => {
  if (isPerfLine(args[0])) {
    nativeConsoleLog(...args);
  }
};

type ArrivalMode = "batch" | "ramp" | "rate";

type ScenarioConfig = {
  id: string;
  title: string;
  arrivalMode: ArrivalMode;
  totalRequests?: number;
  arrivalWindowMs?: number;
  durationMs?: number;
  arrivalRatePerSec?: number;
  concurrency: number;
  toolCallCount: number;
  runtimeGovernorOverride?: {
    max_steps?: number;
    max_time_ms?: number;
    max_cost_usd?: number;
  };
};

type LatencyProfile = {
  queryMs: number;
  mutationMs: number;
  actionMs: number;
  fetchBaseMs: number;
  fetchPerToolCallMs: number;
};

type GovernorTelemetry = {
  limitTriggered: string | null;
  toolCallsTrimmed: number;
  elapsedMs: number;
  estimatedCostUsd: number | null;
};

type InvocationMetrics = {
  latencyMs: number;
  status: string;
  message?: string;
  success: boolean;
  queryCount: number;
  mutationCount: number;
  actionCount: number;
  queryMs: number;
  mutationMs: number;
  actionMs: number;
  fetchMs: number;
  governor: GovernorTelemetry | null;
  runAttempt: {
    attempts: number;
    terminalOutcome: string;
  } | null;
};

type ScenarioResult = {
  id: string;
  title: string;
  requests: number;
  concurrency: number;
  toolCallCount: number;
  runtimeMs: number;
  throughputRps: number;
  latencyMs: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
  };
  stageMsPerRequest: {
    runQuery: number;
    runMutation: number;
    runAction: number;
    fetch: number;
  };
  queue: {
    maxDepth: number;
    p95Depth: number;
    endDepth: number;
    maxInFlight: number;
  };
  memory: {
    startHeapMb: number;
    endHeapMb: number;
    maxHeapMb: number;
    p95HeapMb: number;
  };
  statuses: Record<string, number>;
  topMessages: Array<{ message: string; count: number }>;
  errors: number;
  retries: {
    requestsWithRetry: number;
    maxAttemptsObserved: number;
    terminalOutcomes: Record<string, number>;
  };
  governor: {
    observedRequests: number;
    limits: Record<string, number>;
    totalToolCallsTrimmed: number;
    avgElapsedMs: number;
  };
  dbCardinality: {
    avgQueriesPerRequest: number;
    avgMutationsPerRequest: number;
    avgActionsPerRequest: number;
  };
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return Number(sorted[index].toFixed(2));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function toMb(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function buildToolCalls(toolCallCount: number): Array<Record<string, unknown>> {
  if (toolCallCount <= 0) {
    return [];
  }
  return Array.from({ length: toolCallCount }).map((_, index) => ({
    id: `call_${index + 1}`,
    type: "function",
    function: {
      name: "request_feature",
      arguments: JSON.stringify({
        featureDescription: `Need feature ${index + 1}`,
      }),
    },
  }));
}

function buildOmniOrganizationPayload(organizationId: string): any[] & Record<string, unknown> {
  const payload: any = [];
  payload.enabled = true;
  payload.billingSource = "platform";
  payload.planTier = "pro";
  payload.orgEnabled = [];
  payload.orgDisabled = [];
  payload.policySource = "none";
  payload._id = organizationId;
  payload.name = "Perf Org";
  payload.slug = "perf-org";
  payload.llm = {
    model: "openai/gpt-4o-mini",
    defaultModelId: "openai/gpt-4o-mini",
    enabledModels: [{ modelId: "openai/gpt-4o-mini" }],
    temperature: 0.2,
    maxTokens: 600,
  };
  return payload;
}

function installScenarioFetchMock(args: {
  toolCallCount: number;
  latencyProfile: LatencyProfile;
}): void {
  globalThis.fetch = (async () => {
    const fetchDelay = args.latencyProfile.fetchBaseMs + (args.latencyProfile.fetchPerToolCallMs * args.toolCallCount);
    await sleep(fetchDelay);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "Hello from mocked adapter",
              tool_calls: buildToolCalls(args.toolCallCount),
            },
          },
        ],
        usage: {
          prompt_tokens: 42,
          completion_tokens: 18,
          total_tokens: 60,
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }) as typeof fetch;
}

function createMockContext(args: {
  requestId: string;
  latencyProfile: LatencyProfile;
}): {
  ctx: Record<string, unknown>;
  getMetrics: () => Omit<InvocationMetrics, "latencyMs" | "status" | "success">;
} {
  let q = 0;
  let m = 0;
  let a = 0;

  let queryMs = 0;
  let mutationMs = 0;
  let actionMs = 0;

  const requestIdSuffix = args.requestId;
  const organizationId = `org_${requestIdSuffix}`;
  const sessionId = `session_${requestIdSuffix}`;
  const turnId = `turn_${requestIdSuffix}`;
  const receiptId = `receipt_${requestIdSuffix}`;

  let governorTelemetry: GovernorTelemetry | null = null;
  let runAttempt: { attempts: number; terminalOutcome: string } | null = null;

  const runQuery = async (_ref: unknown, queryArgs: Record<string, unknown>) => {
    q += 1;
    const started = Date.now();
    await sleep(args.latencyProfile.queryMs);

    if (q === 8) {
      queryMs += Date.now() - started;
      return [
        {
          id: "openai/gpt-4o-mini",
          isFreeTierLocked: false,
          providerId: "openrouter",
        },
      ];
    }
    if (q === 21) {
      queryMs += Date.now() - started;
      return {
        hasCredits: true,
        totalCredits: 100,
      };
    }

    if (
      "routeSelectors" in queryArgs &&
      "organizationId" in queryArgs &&
      "channel" in queryArgs
    ) {
      queryMs += Date.now() - started;
      return {
        _id: `agent_${requestIdSuffix}`,
        createdBy: `user_${requestIdSuffix}`,
        subtype: "primary",
        customProperties: {
          autonomyLevel: "autonomous",
          enabledTools: ["request_feature"],
          maxMessagesPerDay: 100,
          maxCostPerDay: 10,
          modelId: "openai/gpt-4o-mini",
          language: "en",
        },
        name: "Agent A",
      };
    }
    if (
      "agentId" in queryArgs &&
      "organizationId" in queryArgs &&
      "maxMessagesPerDay" in queryArgs
    ) {
      queryMs += Date.now() - started;
      return { allowed: true };
    }
    if ("organizationId" in queryArgs && "limit" in queryArgs) {
      queryMs += Date.now() - started;
      return [];
    }
    if ("sessionId" in queryArgs && "limit" in queryArgs) {
      queryMs += Date.now() - started;
      return [];
    }
    if ("organizationId" in queryArgs && Object.keys(queryArgs).length === 1) {
      queryMs += Date.now() - started;
      return buildOmniOrganizationPayload(organizationId);
    }
    if ("sessionId" in queryArgs && Object.keys(queryArgs).length === 1) {
      queryMs += Date.now() - started;
      return null;
    }
    if ("agentId" in queryArgs && Object.keys(queryArgs).length === 1) {
      queryMs += Date.now() - started;
      return {
        _id: `agent_${requestIdSuffix}`,
        createdBy: `user_${requestIdSuffix}`,
        customProperties: {
          autonomyLevel: "autonomous",
          enabledTools: ["request_feature"],
        },
      };
    }
    if ("organizationId" in queryArgs && "preferredModel" in queryArgs) {
      queryMs += Date.now() - started;
      return null;
    }
    if ("modelId" in queryArgs) {
      queryMs += Date.now() - started;
      return {
        modelId: queryArgs.modelId,
        inputCostPerMillion: 1,
        outputCostPerMillion: 2,
      };
    }
    if (
      "organizationId" in queryArgs &&
      "channel" in queryArgs &&
      "externalContactIdentifier" in queryArgs &&
      "messageCount" in queryArgs
    ) {
      queryMs += Date.now() - started;
      return null;
    }
    if ("organizationId" in queryArgs && "provider" in queryArgs) {
      queryMs += Date.now() - started;
      return null;
    }

    queryMs += Date.now() - started;
    return null;
  };

  const runMutation = async (_ref: unknown, mutationArgs: Record<string, unknown>) => {
    m += 1;
    const started = Date.now();
    await sleep(args.latencyProfile.mutationMs);

    if (
      "agentId" in mutationArgs &&
      "organizationId" in mutationArgs &&
      "channel" in mutationArgs &&
      "externalContactIdentifier" in mutationArgs &&
      "channelRouteIdentity" in mutationArgs
    ) {
      mutationMs += Date.now() - started;
      return {
        _id: sessionId,
        agentId: `agent_${requestIdSuffix}`,
        messageCount: 0,
      };
    }
    if (
      "organizationId" in mutationArgs &&
      "sessionId" in mutationArgs &&
      "agentId" in mutationArgs &&
      "reason" in mutationArgs
    ) {
      mutationMs += Date.now() - started;
      return { recoveredTurns: 0 };
    }
    if (
      "organizationId" in mutationArgs &&
      "sessionId" in mutationArgs &&
      "agentId" in mutationArgs &&
      "channel" in mutationArgs &&
      "idempotencyKey" in mutationArgs
    ) {
      mutationMs += Date.now() - started;
      return { receiptId, duplicate: false, status: "ingested" };
    }
    if (
      "organizationId" in mutationArgs &&
      "sessionId" in mutationArgs &&
      "agentId" in mutationArgs &&
      "idempotencyKey" in mutationArgs &&
      "queueContract" in mutationArgs
    ) {
      mutationMs += Date.now() - started;
      return { turnId, transitionVersion: 0, duplicate: false };
    }
    if (
      "turnId" in mutationArgs &&
      "sessionId" in mutationArgs &&
      "agentId" in mutationArgs &&
      "organizationId" in mutationArgs &&
      "leaseOwner" in mutationArgs
    ) {
      mutationMs += Date.now() - started;
      return { success: true, leaseToken: `lease_${requestIdSuffix}`, transitionVersion: 1 };
    }
    if (
      "turnId" in mutationArgs &&
      "expectedVersion" in mutationArgs &&
      "leaseToken" in mutationArgs &&
      "leaseDurationMs" in mutationArgs &&
      !("queueConcurrencyKey" in mutationArgs)
    ) {
      mutationMs += Date.now() - started;
      return {
        success: true,
        transitionVersion: Number(mutationArgs.expectedVersion ?? 0) + 1,
      };
    }
    if ("receiptId" in mutationArgs && "turnId" in mutationArgs && Object.keys(mutationArgs).length === 2) {
      mutationMs += Date.now() - started;
      return { success: true };
    }
    if ("sessionId" in mutationArgs && "turnId" in mutationArgs && "escalationStatus" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { success: true };
    }
    if ("sessionId" in mutationArgs && "turnId" in mutationArgs && "requireSync" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { success: true };
    }
    if ("turnId" in mutationArgs && "runAttempt" in mutationArgs) {
      const runAttemptRaw = mutationArgs.runAttempt as Record<string, unknown>;
      runAttempt = {
        attempts: Number(runAttemptRaw?.attempts ?? 0),
        terminalOutcome: String(runAttemptRaw?.terminalOutcome ?? "unknown"),
      };
      mutationMs += Date.now() - started;
      return { ok: true };
    }
    if ("sessionId" in mutationArgs && "errorState" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { ok: true };
    }
    if (
      "turnId" in mutationArgs &&
      "transitionVersion" in mutationArgs &&
      "leaseToken" in mutationArgs &&
      "state" in mutationArgs
    ) {
      mutationMs += Date.now() - started;
      return {
        success: true,
        transitionVersion: Number(mutationArgs.transitionVersion ?? 0) + 1,
      };
    }
    if (
      "turnId" in mutationArgs &&
      "state" in mutationArgs &&
      "transitionVersion" in mutationArgs &&
      !("leaseToken" in mutationArgs)
    ) {
      mutationMs += Date.now() - started;
      return {
        success: true,
        transitionVersion: Number(mutationArgs.transitionVersion ?? 0) + 1,
      };
    }
    if ("sessionId" in mutationArgs && "tokensUsed" in mutationArgs && "costUsd" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { ok: true };
    }
    if ("agentId" in mutationArgs && "organizationId" in mutationArgs && "actionType" in mutationArgs && "actionData" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { ok: true };
    }
    if ("sessionId" in mutationArgs && "response" in mutationArgs && "message" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { ok: true };
    }
    if ("receiptId" in mutationArgs && "status" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { success: true };
    }
    if ("turnId" in mutationArgs && "leaseToken" in mutationArgs && "settledAt" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { success: true };
    }
    if (
      "organizationId" in mutationArgs
      && "requestType" in mutationArgs
      && "usageMetadata" in mutationArgs
    ) {
      const usageMetadata = (mutationArgs.usageMetadata || {}) as Record<string, unknown>;
      const runtimeGovernor = (usageMetadata.runtimeGovernor || {}) as Record<string, unknown>;
      governorTelemetry = {
        limitTriggered:
          typeof runtimeGovernor.limitTriggered === "string"
            ? runtimeGovernor.limitTriggered
            : null,
        toolCallsTrimmed: Number(runtimeGovernor.toolCallsTrimmed ?? 0),
        elapsedMs: Number(runtimeGovernor.elapsedMs ?? 0),
        estimatedCostUsd:
          typeof runtimeGovernor.estimatedCostUsd === "number"
            ? runtimeGovernor.estimatedCostUsd
            : null,
      };
      mutationMs += Date.now() - started;
      return { ok: true };
    }
    if ("organizationId" in mutationArgs && "amount" in mutationArgs && "action" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { success: true };
    }
    if ("sessionId" in mutationArgs && "modelId" in mutationArgs && "authProfileId" in mutationArgs) {
      mutationMs += Date.now() - started;
      return { ok: true };
    }

    mutationMs += Date.now() - started;
    return { success: true };
  };

  const runAction = async (_ref: unknown, actionArgs: Record<string, unknown>) => {
    a += 1;
    const started = Date.now();
    await sleep(args.latencyProfile.actionMs);

    if (
      "organizationId" in actionArgs &&
      "channel" in actionArgs &&
      "externalContactIdentifier" in actionArgs &&
      "sessionId" in actionArgs &&
      "isFirstInboundMessage" in actionArgs
    ) {
      actionMs += Date.now() - started;
      return null;
    }
    if ("channel" in actionArgs && "message" in actionArgs && "response" in actionArgs) {
      actionMs += Date.now() - started;
      return { status: "success", message: "ok", response: actionArgs.response };
    }
    if ("userId" in actionArgs && "organizationId" in actionArgs && "toolName" in actionArgs) {
      actionMs += Date.now() - started;
      return { success: true };
    }

    actionMs += Date.now() - started;
    return null;
  };

  return {
    ctx: {
      runQuery,
      runMutation,
      runAction,
      scheduler: {
        runAfter: async () => undefined,
      },
    },
    getMetrics: () => ({
      queryCount: q,
      mutationCount: m,
      actionCount: a,
      queryMs,
      mutationMs,
      actionMs,
      fetchMs: 0,
      governor: governorTelemetry,
      runAttempt,
    }),
  };
}

async function invokeAgentExecution(args: {
  requestId: string;
  scenario: ScenarioConfig;
  latencyProfile: LatencyProfile;
}): Promise<InvocationMetrics> {
  const { ctx, getMetrics } = createMockContext({
    requestId: args.requestId,
    latencyProfile: args.latencyProfile,
  });

  const started = Date.now();
  let status = "error";
  let message: string | undefined;
  let success = false;

  try {
    const metadata = args.scenario.runtimeGovernorOverride
      ? {
          runtimeGovernor: args.scenario.runtimeGovernorOverride,
        }
      : {};

    const result = await handler(ctx, {
      organizationId: `org_${args.requestId}`,
      channel: "desktop",
      externalContactIdentifier: `desktop:user_${args.requestId}:local`,
      message: `hello from ${args.requestId}`,
      metadata,
    });

    status = typeof result.status === "string" ? result.status : "error";
    message = typeof result.message === "string" ? result.message : undefined;
    success = status === "success";
  } catch (error) {
    status = "error";
    message = error instanceof Error ? error.message : String(error);
    success = false;
  }

  const latencyMs = Date.now() - started;
  const baseMetrics = getMetrics();
  const estimatedFetchMs = args.latencyProfile.fetchBaseMs
    + (args.latencyProfile.fetchPerToolCallMs * args.scenario.toolCallCount);

  return {
    ...baseMetrics,
    latencyMs,
    status,
    message,
    success,
    fetchMs: estimatedFetchMs,
  };
}

function resolveScenarioRequestCount(scenario: ScenarioConfig): number {
  if (typeof scenario.totalRequests === "number") {
    return scenario.totalRequests;
  }
  if (
    scenario.arrivalMode === "rate"
    && typeof scenario.durationMs === "number"
    && typeof scenario.arrivalRatePerSec === "number"
  ) {
    return Math.max(1, Math.floor((scenario.durationMs / 1000) * scenario.arrivalRatePerSec));
  }
  throw new Error(`Scenario ${scenario.id} has invalid request shape`);
}

function resolveArrivedCount(args: {
  scenario: ScenarioConfig;
  elapsedMs: number;
  totalRequests: number;
}): number {
  if (args.scenario.arrivalMode === "batch") {
    return args.totalRequests;
  }
  if (args.scenario.arrivalMode === "ramp") {
    const windowMs = args.scenario.arrivalWindowMs ?? 1;
    const ratio = Math.min(1, args.elapsedMs / windowMs);
    return Math.floor(args.totalRequests * ratio);
  }
  const rate = args.scenario.arrivalRatePerSec ?? 1;
  const durationMs = args.scenario.durationMs ?? args.elapsedMs;
  if (args.elapsedMs >= durationMs) {
    return args.totalRequests;
  }
  return Math.min(args.totalRequests, Math.floor((args.elapsedMs / 1000) * rate));
}

async function runScenario(args: {
  scenario: ScenarioConfig;
  latencyProfile: LatencyProfile;
}): Promise<ScenarioResult> {
  const { scenario, latencyProfile } = args;
  const totalRequests = resolveScenarioRequestCount(scenario);

  installScenarioFetchMock({
    toolCallCount: scenario.toolCallCount,
    latencyProfile,
  });

  const startedAt = Date.now();
  const latencies: number[] = [];
  const queryCounts: number[] = [];
  const mutationCounts: number[] = [];
  const actionCounts: number[] = [];
  const queryMsValues: number[] = [];
  const mutationMsValues: number[] = [];
  const actionMsValues: number[] = [];
  const fetchMsValues: number[] = [];
  const queueDepthSamples: number[] = [];
  const heapSamples: number[] = [];
  const statuses = new Map<string, number>();
  const messages = new Map<string, number>();
  const retryTerminalOutcomes = new Map<string, number>();
  const governorLimits = new Map<string, number>();

  let requestsCompleted = 0;
  let requestsArrived = 0;
  let requestsStarted = 0;
  let inFlight = 0;
  let maxInFlight = 0;
  let maxQueueDepth = 0;
  let requestsWithRetry = 0;
  let maxAttemptsObserved = 0;
  let governorObserved = 0;
  let totalTrimmed = 0;
  let governorElapsedMsTotal = 0;

  const readyQueue: number[] = [];

  const progressInterval = 10_000;
  let nextProgressAt = progressInterval;

  const memoryTimer = setInterval(() => {
    heapSamples.push(process.memoryUsage().heapUsed);
  }, 1000);

  const launchRequest = (requestNumber: number) => {
    inFlight += 1;
    requestsStarted += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);

    void invokeAgentExecution({
      requestId: `${scenario.id}_${requestNumber}`,
      scenario,
      latencyProfile,
    })
      .then((metrics) => {
        latencies.push(metrics.latencyMs);
        queryCounts.push(metrics.queryCount);
        mutationCounts.push(metrics.mutationCount);
        actionCounts.push(metrics.actionCount);
        queryMsValues.push(metrics.queryMs);
        mutationMsValues.push(metrics.mutationMs);
        actionMsValues.push(metrics.actionMs);
        fetchMsValues.push(metrics.fetchMs);

        statuses.set(metrics.status, (statuses.get(metrics.status) || 0) + 1);
        if (metrics.message) {
          messages.set(metrics.message, (messages.get(metrics.message) || 0) + 1);
        }

        if (metrics.runAttempt) {
          const terminal = metrics.runAttempt.terminalOutcome;
          retryTerminalOutcomes.set(terminal, (retryTerminalOutcomes.get(terminal) || 0) + 1);
          maxAttemptsObserved = Math.max(maxAttemptsObserved, metrics.runAttempt.attempts);
          if (metrics.runAttempt.attempts > 1) {
            requestsWithRetry += 1;
          }
        }

        if (metrics.governor) {
          governorObserved += 1;
          const limitKey = metrics.governor.limitTriggered ?? "none";
          governorLimits.set(limitKey, (governorLimits.get(limitKey) || 0) + 1);
          totalTrimmed += metrics.governor.toolCallsTrimmed;
          governorElapsedMsTotal += metrics.governor.elapsedMs;
        }
      })
      .finally(() => {
        inFlight -= 1;
        requestsCompleted += 1;
      });
  };

  while (requestsCompleted < totalRequests) {
    const elapsedMs = Date.now() - startedAt;
    const arrivedTarget = resolveArrivedCount({
      scenario,
      elapsedMs,
      totalRequests,
    });

    while (requestsArrived < arrivedTarget) {
      readyQueue.push(requestsArrived);
      requestsArrived += 1;
    }

    while (inFlight < scenario.concurrency && readyQueue.length > 0) {
      const requestNumber = readyQueue.shift()!;
      launchRequest(requestNumber);
    }

    const queueDepth = readyQueue.length;
    maxQueueDepth = Math.max(maxQueueDepth, queueDepth);
    queueDepthSamples.push(queueDepth);

    if (elapsedMs >= nextProgressAt) {
      const progressPct = ((requestsCompleted / totalRequests) * 100).toFixed(1);
      console.log(
        `[PERF] ${scenario.id} progress ${progressPct}% (${requestsCompleted}/${totalRequests}), inFlight=${inFlight}, queue=${queueDepth}`
      );
      nextProgressAt += progressInterval;
    }

    await sleep(5);
  }

  clearInterval(memoryTimer);

  const runtimeMs = Date.now() - startedAt;
  const throughputRps = totalRequests / (runtimeMs / 1000);

  const statusObject = Object.fromEntries(statuses.entries());
  const topMessages = Array.from(messages.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));
  const retryOutcomeObject = Object.fromEntries(retryTerminalOutcomes.entries());
  const governorLimitObject = Object.fromEntries(governorLimits.entries());

  return {
    id: scenario.id,
    title: scenario.title,
    requests: totalRequests,
    concurrency: scenario.concurrency,
    toolCallCount: scenario.toolCallCount,
    runtimeMs,
    throughputRps: Number(throughputRps.toFixed(2)),
    latencyMs: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      max: Number(Math.max(...latencies).toFixed(2)),
      min: Number(Math.min(...latencies).toFixed(2)),
    },
    stageMsPerRequest: {
      runQuery: Number(average(queryMsValues).toFixed(2)),
      runMutation: Number(average(mutationMsValues).toFixed(2)),
      runAction: Number(average(actionMsValues).toFixed(2)),
      fetch: Number(average(fetchMsValues).toFixed(2)),
    },
    queue: {
      maxDepth: maxQueueDepth,
      p95Depth: percentile(queueDepthSamples, 95),
      endDepth: queueDepthSamples[queueDepthSamples.length - 1] ?? 0,
      maxInFlight,
    },
    memory: {
      startHeapMb: toMb(heapSamples[0] ?? process.memoryUsage().heapUsed),
      endHeapMb: toMb(heapSamples[heapSamples.length - 1] ?? process.memoryUsage().heapUsed),
      maxHeapMb: toMb(Math.max(...(heapSamples.length > 0 ? heapSamples : [process.memoryUsage().heapUsed]))),
      p95HeapMb: toMb(percentile(heapSamples, 95)),
    },
    statuses: statusObject,
    topMessages,
    errors: totalRequests - (statusObject.success || 0),
    retries: {
      requestsWithRetry,
      maxAttemptsObserved,
      terminalOutcomes: retryOutcomeObject,
    },
    governor: {
      observedRequests: governorObserved,
      limits: governorLimitObject,
      totalToolCallsTrimmed: totalTrimmed,
      avgElapsedMs: governorObserved > 0
        ? Number((governorElapsedMsTotal / governorObserved).toFixed(2))
        : 0,
    },
    dbCardinality: {
      avgQueriesPerRequest: Number(average(queryCounts).toFixed(2)),
      avgMutationsPerRequest: Number(average(mutationCounts).toFixed(2)),
      avgActionsPerRequest: Number(average(actionCounts).toFixed(2)),
    },
  };
}

async function main(): Promise<void> {
  const startedAt = new Date();
  const latencyProfile: LatencyProfile = {
    queryMs: 1,
    mutationMs: 1,
    actionMs: 1,
    fetchBaseMs: 35,
    fetchPerToolCallMs: 6,
  };

  const sustainedDurationMs = Number(process.env.PERF_SUSTAINED_DURATION_MS || (5 * 60 * 1000));
  const scenarios: ScenarioConfig[] = [
    {
      id: "10x5_tools",
      title: "10 concurrent agents with 5 tool calls each",
      arrivalMode: "batch",
      totalRequests: 10,
      concurrency: 10,
      toolCallCount: 5,
      runtimeGovernorOverride: {
        max_steps: 4,
      },
    },
    {
      id: "50_simple",
      title: "50 concurrent simple agents (1 tool call)",
      arrivalMode: "batch",
      totalRequests: 50,
      concurrency: 50,
      toolCallCount: 1,
    },
    {
      id: "sustained_5m",
      title: "Sustained load for 5 minutes",
      arrivalMode: "rate",
      durationMs: sustainedDurationMs,
      arrivalRatePerSec: 2,
      concurrency: 20,
      toolCallCount: 2,
    },
    {
      id: "burst_100_10s",
      title: "Burst: idle to 100 agents in 10 seconds",
      arrivalMode: "ramp",
      totalRequests: 100,
      arrivalWindowMs: 10_000,
      concurrency: 30,
      toolCallCount: 5,
      runtimeGovernorOverride: {
        max_steps: 3,
      },
    },
  ];

  const scenarioFilter = process.env.PERF_SCENARIO_FILTER;
  const selectedScenarios = scenarioFilter
    ? scenarios.filter((scenario) => scenario.id === scenarioFilter)
    : scenarios;

  const results: ScenarioResult[] = [];
  for (const scenario of selectedScenarios) {
    console.log(`[PERF] Starting scenario ${scenario.id}`);
    const result = await runScenario({ scenario, latencyProfile });
    results.push(result);
    console.log(
      `[PERF] Completed ${scenario.id}: p95=${result.latencyMs.p95}ms, throughput=${result.throughputRps} rps, maxQueue=${result.queue.maxDepth}`
    );
  }

  const completedAt = new Date();
  const summary = {
    generatedAt: completedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    environment: "synthetic_processInboundMessage_mocked_ctx",
    latencyProfile,
    scenarios: results,
  };

  const reportDir = join(process.cwd(), "tmp/reports/platform-usage-accounting-guardrails");
  mkdirSync(reportDir, { recursive: true });
  const stamp = completedAt.toISOString().replace(/[:.]/g, "-");
  const jsonPath = join(reportDir, `agentic-runtime-load-audit-${stamp}.json`);

  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`[PERF] Report written: ${jsonPath}`);
}

void main();
