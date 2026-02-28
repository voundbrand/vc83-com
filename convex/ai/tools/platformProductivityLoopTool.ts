import type { AITool, ToolExecutionContext } from "./registry";

// Lazy-load generated refs to avoid TS2589.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

const PRODUCTIVITY_OUTPUT_VERSION = "productivity_plan.v1";
const UNIFIED_COMPOSER_CONTRACT_VERSION = "composer_contract.v1";

type WorkflowPhase =
  | "full_loop"
  | "refine_workflow"
  | "integration_setup"
  | "deploy_readiness";

type DeploymentTarget = "webchat" | "telegram" | "desktop" | "mobile" | "all";

interface ProductivityMetricInput {
  metric: string;
  current: number;
  target: number;
}

interface WorkflowStep {
  stepId: string;
  title: string;
  owner: "operator" | "assistant";
  action: string;
  verification: string;
}

interface ToolMapping {
  tool: string;
  whenToUse: string;
  expectedOutput: string;
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry))
    )
  );
}

function normalizeMetrics(value: unknown): ProductivityMetricInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const metrics: ProductivityMetricInput[] = [];
  for (const rawMetric of value) {
    if (!rawMetric || typeof rawMetric !== "object") {
      continue;
    }
    const record = rawMetric as Record<string, unknown>;
    const metric = normalizeNonEmptyString(record.metric);
    const current = record.current;
    const target = record.target;
    if (
      !metric
      || typeof current !== "number"
      || !Number.isFinite(current)
      || typeof target !== "number"
      || !Number.isFinite(target)
    ) {
      continue;
    }
    metrics.push({
      metric,
      current,
      target,
    });
  }
  return metrics;
}

function resolveRequiredIntegrations(args: {
  requiredIntegrations: string[];
  deploymentTarget: DeploymentTarget;
}): string[] {
  const inferred = new Set<string>(args.requiredIntegrations);
  if (args.deploymentTarget === "all" || args.deploymentTarget === "webchat") {
    inferred.add("resend");
  }
  if (args.deploymentTarget === "all" || args.deploymentTarget === "telegram") {
    inferred.add("microsoft");
  }
  if (args.deploymentTarget === "all" || args.deploymentTarget === "desktop") {
    inferred.add("github");
  }
  return Array.from(inferred);
}

function buildWorkflowSteps(args: {
  phase: WorkflowPhase;
  objective: string;
  blockers: string[];
  metrics: ProductivityMetricInput[];
}): WorkflowStep[] {
  const baseSteps: WorkflowStep[] = [
    {
      stepId: "P-001",
      title: "Lock workflow objective",
      owner: "operator",
      action: `Confirm objective scope: "${args.objective}".`,
      verification: "Objective has one owner and one measurable success outcome.",
    },
    {
      stepId: "P-002",
      title: "Refine workflow graph",
      owner: "assistant",
      action:
        "Generate deterministic workflow sequence with explicit dependencies and fallback branches.",
      verification: "Each node has trigger, action, and failure fallback mapped.",
    },
    {
      stepId: "P-003",
      title: "Map tool calls to workflow nodes",
      owner: "assistant",
      action: "Bind each workflow node to one concrete tool action and expected output artifact.",
      verification: "No workflow node is missing tool mapping or output artifact contract.",
    },
    {
      stepId: "P-004",
      title: "Validate integrations and credentials",
      owner: "operator",
      action: "Resolve missing providers, API keys, and channel bindings before deployment.",
      verification: "All required integrations are connected and test probes pass.",
    },
    {
      stepId: "P-005",
      title: "Run deploy-readiness gate",
      owner: "assistant",
      action: "Execute deploy checks, identify blockers, and produce rollback-safe launch guidance.",
      verification: "Deploy gate output is explicit: deploy_ready, needs_setup, or blocked.",
    },
  ];

  if (args.phase === "refine_workflow") {
    return baseSteps.slice(0, 3);
  }
  if (args.phase === "integration_setup") {
    return [baseSteps[0], baseSteps[3]];
  }
  if (args.phase === "deploy_readiness") {
    return [baseSteps[0], baseSteps[4]];
  }

  const metricDrivenStep: WorkflowStep | null =
    args.metrics.length > 0
      ? {
          stepId: "P-006",
          title: "Schedule success review window",
          owner: "operator",
          action:
            "Set a 7-day review using the supplied metrics and commit remediation ownership for deltas.",
          verification:
            "Each metric has baseline, target, and owner-assigned remediation action.",
        }
      : null;

  if (metricDrivenStep) {
    return [...baseSteps, metricDrivenStep];
  }

  if (args.blockers.length > 0) {
    return [
      ...baseSteps,
      {
        stepId: "P-006",
        title: "Clear active blockers",
        owner: "operator",
        action: `Resolve blockers: ${args.blockers.join("; ")}`,
        verification: "All blockers are either closed or converted into scheduled remediation tasks.",
      },
    ];
  }

  return baseSteps;
}

function buildToolMappings(phase: WorkflowPhase): ToolMapping[] {
  const baseMappings: ToolMapping[] = [
    {
      tool: "create_layers_workflow",
      whenToUse: "When converting a validated brief into deterministic node/edge workflow definition.",
      expectedOutput: "Layer workflow object with triggers and fallback paths.",
    },
    {
      tool: "link_objects",
      whenToUse: "After workflows exist and artifacts (forms/products/checkouts) must be linked.",
      expectedOutput: "Explicit object link graph (`workflow_form`, `workflow_sequence`, `checkout_product`).",
    },
    {
      tool: "detect_webapp_connections",
      whenToUse: "Before deployment to identify placeholder-to-record bindings and unresolved data references.",
      expectedOutput: "Connection detection report with exact unmatched entities.",
    },
    {
      tool: "connect_webapp_data",
      whenToUse: "After detection to bind placeholders to existing or newly created records.",
      expectedOutput: "Connection patch summary with linked object IDs.",
    },
    {
      tool: "check_deploy_status",
      whenToUse: "Before and after deployment to confirm readiness and post-deploy health.",
      expectedOutput: "Deployment readiness snapshot with explicit blockers.",
    },
    {
      tool: "deploy_webapp",
      whenToUse: "Only after readiness checks and credential setup pass.",
      expectedOutput: "Deployment packet with repo URL, deploy URL, and current deploy state.",
    },
  ];

  if (phase === "integration_setup") {
    return baseMappings.filter(
      (mapping) =>
        mapping.tool === "detect_webapp_connections"
        || mapping.tool === "connect_webapp_data"
        || mapping.tool === "check_deploy_status"
    );
  }

  if (phase === "deploy_readiness") {
    return baseMappings.filter(
      (mapping) => mapping.tool === "check_deploy_status" || mapping.tool === "deploy_webapp"
    );
  }

  if (phase === "refine_workflow") {
    return baseMappings.filter(
      (mapping) => mapping.tool === "create_layers_workflow" || mapping.tool === "link_objects"
    );
  }

  return baseMappings;
}

export const runPlatformProductivityLoopTool: AITool = {
  name: "run_platform_productivity_loop",
  description:
    "Generate deterministic platform-agent productivity guidance for workflow refinement, integration setup, and deploy-readiness coaching. " +
    "Returns concrete workflow steps, exact tool mappings, and launch recommendations (not generic advice).",
  status: "ready",
  readOnly: true,
  parameters: {
    type: "object",
    properties: {
      objective: {
        type: "string",
        description: "Primary productivity objective (e.g., reduce setup time, improve deploy reliability).",
      },
      workflowPhase: {
        type: "string",
        enum: ["full_loop", "refine_workflow", "integration_setup", "deploy_readiness"],
        description: "Scope of guidance to return.",
      },
      deploymentTarget: {
        type: "string",
        enum: ["webchat", "telegram", "desktop", "mobile", "all"],
        description: "Primary target channel/runtime for deployment readiness checks.",
      },
      requiredIntegrations: {
        type: "array",
        items: { type: "string" },
        description: "Optional provider IDs that must be connected before deploy.",
      },
      blockers: {
        type: "array",
        items: { type: "string" },
        description: "Known blockers to include in the remediation plan.",
      },
      metrics: {
        type: "array",
        description: "Optional metric baseline/target pairs to drive review windows.",
        items: {
          type: "object",
          properties: {
            metric: { type: "string" },
            current: { type: "number" },
            target: { type: "number" },
          },
          required: ["metric", "current", "target"],
        },
      },
    },
    required: ["objective"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      objective: string;
      workflowPhase?: WorkflowPhase;
      deploymentTarget?: DeploymentTarget;
      requiredIntegrations?: string[];
      blockers?: string[];
      metrics?: ProductivityMetricInput[];
    }
  ) => {
    const phase: WorkflowPhase = args.workflowPhase || "full_loop";
    const deploymentTarget: DeploymentTarget = args.deploymentTarget || "all";
    const requiredIntegrations = resolveRequiredIntegrations({
      requiredIntegrations: normalizeStringArray(args.requiredIntegrations),
      deploymentTarget,
    });
    const blockers = normalizeStringArray(args.blockers);
    const metrics = normalizeMetrics(args.metrics);

    const connectedIntegrations = (await ctx.runQuery(
      getInternal().ai.toolScoping.getConnectedIntegrations,
      { organizationId: ctx.organizationId }
    )) as string[];
    const connectedSet = new Set(connectedIntegrations);
    const missingIntegrations = requiredIntegrations.filter(
      (integration) => !connectedSet.has(integration)
    );

    const deployBlockers = [
      ...blockers,
      ...missingIntegrations.map(
        (integration) => `Missing integration connection: ${integration}`
      ),
    ];

    const deploymentStatus =
      deployBlockers.length === 0
        ? "deploy_ready"
        : missingIntegrations.length > 0
        ? "needs_setup"
        : "blocked";

    return {
      outputSchema: PRODUCTIVITY_OUTPUT_VERSION,
      objective: args.objective,
      workflowPhase: phase,
      deploymentTarget,
      workflowSteps: buildWorkflowSteps({
        phase,
        objective: args.objective,
        blockers,
        metrics,
      }),
      toolMappings: buildToolMappings(phase),
      integrationSetupGuidance: {
        connected: connectedIntegrations,
        required: requiredIntegrations,
        missing: missingIntegrations,
        setupActions: missingIntegrations.map((integration) => ({
          integration,
          recommendation:
            `Connect ${integration} in Integrations before running deploy or publish actions.`,
        })),
      },
      deployReadiness: {
        status: deploymentStatus,
        blockers: deployBlockers,
        recommendedNextAction:
          deploymentStatus === "deploy_ready"
            ? "Run deploy_webapp and confirm production URL health checks."
            : "Resolve listed blockers, then rerun run_platform_productivity_loop for readiness re-evaluation.",
      },
      successReviewWindow: {
        days: 7,
        metrics:
          metrics.length > 0
            ? metrics.map((metric) => ({
                metric: metric.metric,
                baseline: metric.current,
                target: metric.target,
                deltaToTarget: Number((metric.target - metric.current).toFixed(4)),
              }))
            : [],
      },
      composerContract: {
        schema: UNIFIED_COMPOSER_CONTRACT_VERSION,
        surface: "unified_voice_text",
        defaultLayoutMode: "slick",
        firstRunCreationEntry: true,
      },
      nextAction:
        deploymentStatus === "deploy_ready"
          ? "Proceed to deployment and monitor post-deploy checks."
          : "Clear blockers and rerun readiness gate.",
    };
  },
};

