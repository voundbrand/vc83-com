import { internalQuery } from "../../_generated/server";
import { v } from "convex/values";
import {
  evaluateModelEnablementReleaseGates,
  type ModelValidationTestResults,
} from "../modelEnablementGates";
import {
  evaluateTrustRolloutGuardrails,
  type TrustKpiMetricKey,
} from "../trustTelemetry";
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

type DeterministicLabel = "PASS" | "FAIL";

type LayerResult = {
  layer: "model_conformance" | "workflow_behavior" | "live_eval" | "telemetry_rollout";
  label: DeterministicLabel;
  failedMetrics: string[];
  summary: string;
};

interface ManualGateCheck {
  checkId: string;
  passed: boolean;
  failedMetric?: string;
  details?: string;
}

interface ModelSnapshot {
  modelId: string;
  name: string;
  validationStatus?: "not_tested" | "validated" | "failed";
  testResults?: ModelValidationTestResults;
  isPlatformEnabled?: boolean;
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
        .filter((entry): entry is string => Boolean(entry)),
    ),
  );
}

function normalizeManualChecks(value: unknown): ManualGateCheck[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const checks: ManualGateCheck[] = [];
  for (const rawCheck of value) {
    if (!rawCheck || typeof rawCheck !== "object") {
      continue;
    }

    const record = rawCheck as Record<string, unknown>;
    const checkId = normalizeNonEmptyString(record.checkId);
    if (!checkId || typeof record.passed !== "boolean") {
      continue;
    }

    checks.push({
      checkId,
      passed: record.passed,
      failedMetric: normalizeNonEmptyString(record.failedMetric) || undefined,
      details: normalizeNonEmptyString(record.details) || undefined,
    });
  }

  return checks;
}

function normalizeTelemetryObservations(
  value: unknown,
): Partial<Record<TrustKpiMetricKey, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;

  const metrics: TrustKpiMetricKey[] = [
    "voice_session_start_rate",
    "voice_session_completion_rate",
    "voice_cancel_without_save_rate",
    "voice_memory_consent_accept_rate",
    "voice_runtime_failure_rate",
    "agent_creation_handoff_success_rate",
  ];

  const normalized: Partial<Record<TrustKpiMetricKey, number>> = {};
  for (const metric of metrics) {
    const valueForMetric = record[metric];
    if (typeof valueForMetric === "number" && Number.isFinite(valueForMetric)) {
      normalized[metric] = valueForMetric;
    }
  }

  return normalized;
}

function evaluateManualLayer(args: {
  layer: "workflow_behavior" | "live_eval";
  checks: ManualGateCheck[];
}): LayerResult {
  if (args.checks.length === 0) {
    return {
      layer: args.layer,
      label: "FAIL",
      failedMetrics: [`${args.layer}_checks_missing`],
      summary: `No ${args.layer} evidence checks supplied.`,
    };
  }

  const failedChecks = args.checks.filter((check) => !check.passed);
  if (failedChecks.length === 0) {
    return {
      layer: args.layer,
      label: "PASS",
      failedMetrics: [],
      summary: `${args.layer} checks passed (${args.checks.length}/${args.checks.length}).`,
    };
  }

  const failedMetrics = failedChecks.map((check) => check.failedMetric || check.checkId);
  return {
    layer: args.layer,
    label: "FAIL",
    failedMetrics,
    summary: `${args.layer} checks failed (${failedChecks.length}/${args.checks.length}).`,
  };
}

function decisionStopCondition(decision: "proceed" | "hold" | "rollback"):
  | "decision_proceed"
  | "decision_hold"
  | "decision_rollback" {
  if (decision === "rollback") {
    return "decision_rollback";
  }
  if (decision === "hold") {
    return "decision_hold";
  }
  return "decision_proceed";
}

export const getModelSnapshotsForEval = internalQuery({
  args: {
    modelIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<ModelSnapshot[]> => {
    const allModels = await ctx.db.query("aiModels").collect();

    const modelFilter = new Set(
      (args.modelIds || [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    );

    return allModels
      .filter((model) => {
        if (modelFilter.size === 0) {
          return model.isPlatformEnabled === true;
        }
        return modelFilter.has(model.modelId);
      })
      .map((model) => ({
        modelId: model.modelId,
        name: model.name,
        validationStatus: model.validationStatus,
        testResults: model.testResults as ModelValidationTestResults | undefined,
        isPlatformEnabled: model.isPlatformEnabled,
      }));
  },
});

export const runEvalAnalystChecksTool: AITool = {
  name: "run_eval_analyst_checks",
  description:
    "Run Eval Analyst release-gate synthesis across model conformance, workflow behavior, live checks, and telemetry. "
    + "Always returns deterministic PASS/FAIL labels and proceed/hold/rollback decisions.",
  status: "ready",
  readOnly: true,
  parameters: {
    type: "object",
    properties: {
      evaluationIntent: {
        type: "string",
        enum: ["run_eval", "gate_release"],
        description: "Intent marker for orchestration context.",
      },
      modelIds: {
        type: "array",
        items: { type: "string" },
        description: "Optional model IDs to evaluate. Defaults to platform-enabled models.",
      },
      operationalReviewAcknowledged: {
        type: "boolean",
        description: "Set true when human operational review has been acknowledged.",
      },
      workflowChecks: {
        type: "array",
        description: "Workflow gate checks with deterministic pass/fail flags.",
        items: {
          type: "object",
          properties: {
            checkId: { type: "string" },
            passed: { type: "boolean" },
            failedMetric: { type: "string" },
            details: { type: "string" },
          },
          required: ["checkId", "passed"],
        },
      },
      liveChecks: {
        type: "array",
        description: "Live soul-binding/interview checks with deterministic pass/fail flags.",
        items: {
          type: "object",
          properties: {
            checkId: { type: "string" },
            passed: { type: "boolean" },
            failedMetric: { type: "string" },
            details: { type: "string" },
          },
          required: ["checkId", "passed"],
        },
      },
      telemetryObservations: {
        type: "object",
        description:
          "Optional telemetry metric observations keyed by trust KPI metric IDs.",
      },
    },
    required: [],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      evaluationIntent?: "run_eval" | "gate_release";
      modelIds?: string[];
      operationalReviewAcknowledged?: boolean;
      workflowChecks?: ManualGateCheck[];
      liveChecks?: ManualGateCheck[];
      telemetryObservations?: Partial<Record<TrustKpiMetricKey, number>>;
    },
  ) => {
    const modelIds = normalizeStringArray(args.modelIds);
    const workflowChecks = normalizeManualChecks(args.workflowChecks);
    const liveChecks = normalizeManualChecks(args.liveChecks);
    const telemetryObservations = normalizeTelemetryObservations(args.telemetryObservations);

    const modelSnapshots = (await ctx.runQuery(
      getInternal().ai.tools.evalAnalystTool.getModelSnapshotsForEval,
      {
        modelIds: modelIds.length > 0 ? modelIds : undefined,
      },
    )) as ModelSnapshot[];

    const modelResults = modelSnapshots.map((model) => {
      const gate = evaluateModelEnablementReleaseGates({
        model: {
          modelId: model.modelId,
          validationStatus: model.validationStatus,
          testResults: model.testResults,
        },
        operationalReviewAcknowledged: args.operationalReviewAcknowledged !== false,
      });

      return {
        modelId: model.modelId,
        modelName: model.name,
        isPlatformEnabled: model.isPlatformEnabled === true,
        label: gate.passed ? "PASS" : "FAIL",
        missingHardGateChecks: gate.missingHardGateChecks,
        failedConformanceMetrics: gate.failedConformanceMetrics,
        reasons: gate.reasons,
      };
    });

    const modelLayerFailedMetrics =
      modelResults.length === 0
        ? ["model_checks_missing"]
        : modelResults
            .filter((result) => result.label === "FAIL")
            .flatMap((result) => [
              ...result.missingHardGateChecks.map((check) => `${result.modelId}:${check}`),
              ...result.failedConformanceMetrics.map((metric) => `${result.modelId}:${metric}`),
            ]);

    const modelLayer: LayerResult = {
      layer: "model_conformance",
      label: modelLayerFailedMetrics.length === 0 ? "PASS" : "FAIL",
      failedMetrics: modelLayerFailedMetrics,
      summary:
        modelResults.length === 0
          ? "No eligible models were found for eval checks."
          : `Models passing release gates: ${modelResults.filter((result) => result.label === "PASS").length}/${modelResults.length}.`,
    };

    const workflowLayer = evaluateManualLayer({
      layer: "workflow_behavior",
      checks: workflowChecks,
    });

    const liveLayer = evaluateManualLayer({
      layer: "live_eval",
      checks: liveChecks,
    });

    const telemetryDecision = evaluateTrustRolloutGuardrails(telemetryObservations);
    const telemetryFailedMetrics = [
      ...telemetryDecision.missingMetrics.map((metric) => `missing:${metric}`),
      ...telemetryDecision.warningMetrics.map((metric) => `warning:${metric}`),
      ...telemetryDecision.criticalMetrics.map((metric) => `critical:${metric}`),
    ];
    const telemetryLayer: LayerResult = {
      layer: "telemetry_rollout",
      label: telemetryDecision.status === "proceed" ? "PASS" : "FAIL",
      failedMetrics: telemetryFailedMetrics,
      summary:
        telemetryDecision.status === "proceed"
          ? "Telemetry rollout guardrails passed."
          : `Telemetry rollout guardrails returned ${telemetryDecision.status}.`,
    };

    const layers: LayerResult[] = [
      modelLayer,
      workflowLayer,
      liveLayer,
      telemetryLayer,
    ];

    const failedLayers = layers.filter((layer) => layer.label === "FAIL");
    const failedMetrics = failedLayers.flatMap((layer) => layer.failedMetrics);

    let decision: "proceed" | "hold" | "rollback" = "proceed";
    if (telemetryDecision.status === "rollback") {
      decision = "rollback";
    } else if (failedLayers.length > 0) {
      decision = "hold";
    }

    const severity =
      decision === "rollback" ? "critical" : decision === "hold" ? "warning" : "ok";

    const requiredRemediation = failedLayers.map((layer) => ({
      layer: layer.layer,
      action: layer.summary,
      failedMetrics: layer.failedMetrics,
    }));

    return {
      outputSchema: "eval_decision_packet.v1",
      evaluationIntent: args.evaluationIntent || "run_eval",
      resultLabel: decision === "proceed" ? "PASS" : "FAIL",
      decision,
      stopCondition: decisionStopCondition(decision),
      severity,
      passFailByLayer: layers,
      failedMetrics,
      requiredRemediation,
      modelGateResults: modelResults,
      telemetryGuardrailDecision: {
        status: telemetryDecision.status,
        label: telemetryDecision.status === "proceed" ? "PASS" : "FAIL",
        missingMetrics: telemetryDecision.missingMetrics,
        warningMetrics: telemetryDecision.warningMetrics,
        criticalMetrics: telemetryDecision.criticalMetrics,
      },
    };
  },
};
