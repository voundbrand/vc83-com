import fs from "node:fs";
import path from "node:path";

export const WAE_PLAYWRIGHT_SCENARIO_DSL_CONTRACT_VERSION =
  "wae_eval_playwright_scenario_dsl_v1" as const;
export const WAE_MATRIX_CONTRACT_VERSION = "wae_eval_scenario_matrix_v1" as const;

export type WaeScenarioExecutionMode =
  | "RUN"
  | "RUN_WITH_PENDING_SUBCHECKS"
  | "SKIP_UNTIL_FEATURE";

export type WaeFeatureDeliveryState = "PENDING" | "DELIVERED";

export interface WaeFeatureGate {
  featureKey: string;
  mode: "full" | "partial";
  blockedChecks: string[];
}

interface WaeRawScenario {
  id: string;
  agentId: string;
  title: string;
  executionMode: WaeScenarioExecutionMode;
  priority: string;
  promptTemplate: string;
  requiredToolsAllOf?: string[];
  requiredToolsAnyOf?: string[];
  forbiddenTools?: string[];
  requiredOutcomes?: string[];
  rubricId: string;
  pendingFeatureGates?: WaeFeatureGate[];
  specRef: string;
}

interface WaeRawCrossAgentAssertion {
  id: string;
  elaRef: string;
  executionMode: "RUN" | "SKIP_UNTIL_FEATURE";
  assertion: string;
  requiredEvidence: string[];
  failReasonCode: string;
}

interface WaeRawScenarioMatrix {
  contractVersion: string;
  summary: {
    scenarioCount: number;
    executionModeCounts: Record<WaeScenarioExecutionMode, number>;
    crossAgentAssertionCount: {
      domainIsolation: number;
      adapterBoundary: number;
      portfolioInvariants: number;
    };
  };
  scenarios: WaeRawScenario[];
  crossAgentAssertions: {
    domainIsolation: WaeRawCrossAgentAssertion[];
    adapterBoundary: WaeRawCrossAgentAssertion[];
    portfolioInvariants: WaeRawCrossAgentAssertion[];
  };
}

export interface WaeScenarioDslRow {
  id: string;
  agentId: string;
  title: string;
  promptTemplate: string;
  priority: string;
  rubricId: string;
  executionMode: WaeScenarioExecutionMode;
  requiredToolsAllOf: string[];
  requiredToolsAnyOf: string[];
  forbiddenTools: string[];
  requiredOutcomes: string[];
  specRef: string;
  runtime: {
    verdict: "RUN" | "SKIPPED";
    reasonCodes: string[];
    skippedSubchecks: string[];
    pendingFeatureKeys: string[];
  };
}

export interface WaeCrossAgentDslRow {
  id: string;
  category: "domainIsolation" | "adapterBoundary" | "portfolioInvariants";
  elaRef: string;
  assertion: string;
  requiredEvidence: string[];
  failReasonCode: string;
  executionMode: "RUN" | "SKIP_UNTIL_FEATURE";
  runtime: {
    verdict: "RUN" | "SKIPPED";
    reasonCodes: string[];
  };
}

export interface WaeScenarioDslBundle {
  contractVersion: typeof WAE_PLAYWRIGHT_SCENARIO_DSL_CONTRACT_VERSION;
  matrixContractVersion: typeof WAE_MATRIX_CONTRACT_VERSION;
  generatedAt: string;
  paths: {
    matrixPath: string;
    specsPath: string;
  };
  counts: {
    scenarios: number;
    run: number;
    skipped: number;
    crossAgentAssertions: number;
  };
  scenarios: WaeScenarioDslRow[];
  crossAgentAssertions: WaeCrossAgentDslRow[];
}

const WORKSTREAM_ROOT = path.join(
  process.cwd(),
  "docs",
  "reference_docs",
  "topic_collections",
  "implementation",
  "web-ai-chat-agent-evals",
);

export const WAE_SCENARIO_MATRIX_PATH = path.join(
  WORKSTREAM_ROOT,
  "AGENT_EVAL_SCENARIO_MATRIX.json",
);

export const WAE_AGENT_EVAL_SPECS_PATH = path.join(WORKSTREAM_ROOT, "AGENT_EVAL_SPECS.md");

function collectLexicalStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0),
    ),
  ).sort();
}

function normalizeFeatureEnvVarName(featureKey: string): string {
  return `WAE_FEATURE_${featureKey.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
}

function resolveFeatureState(args: {
  featureKey: string;
  overrides?: Record<string, WaeFeatureDeliveryState>;
}): WaeFeatureDeliveryState {
  const override = args.overrides?.[args.featureKey];
  if (override) {
    return override;
  }
  const raw = process.env[normalizeFeatureEnvVarName(args.featureKey)]?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "ready" || raw === "delivered") {
    return "DELIVERED";
  }
  return "PENDING";
}

function assertMatrixContract(matrix: WaeRawScenarioMatrix): asserts matrix is WaeRawScenarioMatrix {
  if (matrix.contractVersion !== WAE_MATRIX_CONTRACT_VERSION) {
    throw new Error(
      `WAE matrix contract mismatch: expected ${WAE_MATRIX_CONTRACT_VERSION}, received ${matrix.contractVersion}`,
    );
  }
}

function loadWaeScenarioMatrix(): WaeRawScenarioMatrix {
  const matrix = JSON.parse(
    fs.readFileSync(WAE_SCENARIO_MATRIX_PATH, "utf8"),
  ) as WaeRawScenarioMatrix;
  assertMatrixContract(matrix);
  return matrix;
}

function buildScenarioRow(args: {
  scenario: WaeRawScenario;
  specsMarkdown: string;
  featureStates?: Record<string, WaeFeatureDeliveryState>;
}): WaeScenarioDslRow {
  const scenario = args.scenario;
  const pendingFeatureGates = scenario.pendingFeatureGates ?? [];

  const pendingFeatureKeys = collectLexicalStrings(
    pendingFeatureGates
      .filter((gate) =>
        resolveFeatureState({ featureKey: gate.featureKey, overrides: args.featureStates }) === "PENDING",
      )
      .map((gate) => gate.featureKey),
  );

  const fullPendingGates = pendingFeatureGates.filter((gate) =>
    gate.mode === "full"
    && resolveFeatureState({ featureKey: gate.featureKey, overrides: args.featureStates }) === "PENDING",
  );

  const partialPendingSubchecks = pendingFeatureGates
    .filter((gate) =>
      gate.mode === "partial"
      && resolveFeatureState({ featureKey: gate.featureKey, overrides: args.featureStates }) === "PENDING",
    )
    .flatMap((gate) => gate.blockedChecks.map((check) => `${gate.featureKey}:${check}`));

  const specIdFromRef = scenario.specRef.split("#")[1] || "";
  const specRefFound =
    (specIdFromRef.length > 0 && args.specsMarkdown.includes(specIdFromRef))
    || args.specsMarkdown.includes(scenario.id);

  const reasonCodes = collectLexicalStrings([
    ...fullPendingGates.map((gate) => `pending_feature:${gate.featureKey}`),
    ...(specRefFound ? [] : ["spec_reference_missing"]),
    ...(scenario.executionMode === "SKIP_UNTIL_FEATURE" && fullPendingGates.length === 0
      ? ["pending_feature:execution_mode_gate"]
      : []),
  ]);

  const verdict =
    scenario.executionMode === "SKIP_UNTIL_FEATURE" || fullPendingGates.length > 0
      ? "SKIPPED"
      : "RUN";

  return {
    id: scenario.id,
    agentId: scenario.agentId,
    title: scenario.title,
    promptTemplate: scenario.promptTemplate,
    priority: scenario.priority,
    rubricId: scenario.rubricId,
    executionMode: scenario.executionMode,
    requiredToolsAllOf: [...(scenario.requiredToolsAllOf ?? [])],
    requiredToolsAnyOf: [...(scenario.requiredToolsAnyOf ?? [])],
    forbiddenTools: [...(scenario.forbiddenTools ?? [])],
    requiredOutcomes: [...(scenario.requiredOutcomes ?? [])],
    specRef: scenario.specRef,
    runtime: {
      verdict,
      reasonCodes,
      skippedSubchecks: collectLexicalStrings(partialPendingSubchecks),
      pendingFeatureKeys,
    },
  };
}

function buildCrossAgentRows(args: {
  matrix: WaeRawScenarioMatrix;
}): WaeCrossAgentDslRow[] {
  const entries: WaeCrossAgentDslRow[] = [];
  const categoryKeys = ["adapterBoundary", "domainIsolation", "portfolioInvariants"] as const;

  for (const category of categoryKeys) {
    for (const assertion of args.matrix.crossAgentAssertions[category]) {
      entries.push({
        id: assertion.id,
        category,
        elaRef: assertion.elaRef,
        assertion: assertion.assertion,
        requiredEvidence: [...assertion.requiredEvidence],
        failReasonCode: assertion.failReasonCode,
        executionMode: assertion.executionMode,
        runtime: {
          verdict: assertion.executionMode === "SKIP_UNTIL_FEATURE" ? "SKIPPED" : "RUN",
          reasonCodes:
            assertion.executionMode === "SKIP_UNTIL_FEATURE"
              ? ["pending_feature:architecture-decoupling-ela-lane-j"]
              : [],
        },
      });
    }
  }

  return [...entries].sort((left, right) => left.id.localeCompare(right.id));
}

export function buildWaeScenarioDsl(args?: {
  featureStates?: Record<string, WaeFeatureDeliveryState>;
}): WaeScenarioDslBundle {
  const matrix = loadWaeScenarioMatrix();
  const specsMarkdown = fs.readFileSync(WAE_AGENT_EVAL_SPECS_PATH, "utf8");

  const scenarios = [...matrix.scenarios]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((scenario) =>
      buildScenarioRow({
        scenario,
        specsMarkdown,
        featureStates: args?.featureStates,
      }),
    );

  const crossAgentAssertions = buildCrossAgentRows({ matrix });

  const skipped = scenarios.filter((scenario) => scenario.runtime.verdict === "SKIPPED").length;
  const run = scenarios.length - skipped;

  return {
    contractVersion: WAE_PLAYWRIGHT_SCENARIO_DSL_CONTRACT_VERSION,
    matrixContractVersion: WAE_MATRIX_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    paths: {
      matrixPath: WAE_SCENARIO_MATRIX_PATH,
      specsPath: WAE_AGENT_EVAL_SPECS_PATH,
    },
    counts: {
      scenarios: scenarios.length,
      run,
      skipped,
      crossAgentAssertions: crossAgentAssertions.length,
    },
    scenarios,
    crossAgentAssertions,
  };
}
