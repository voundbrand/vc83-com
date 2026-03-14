import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { collectLexicalReasonCodes } from "./wae-eval-fixture";
import type { WaeScenarioDslRow } from "./wae-scenario-dsl";

export const WAE_SCENARIO_EXECUTION_CONTRACT_VERSION =
  "wae_eval_playwright_scenario_execution_v1" as const;
export const WAE_SCENARIO_ATTEMPT_ARTIFACT_CONTRACT_VERSION =
  "wae_eval_playwright_scenario_attempt_artifact_v1" as const;
export const WAE_SCENARIO_ATTEMPT_INDEX_CONTRACT_VERSION =
  "wae_eval_playwright_scenario_attempt_index_v1" as const;

const NEGATIVE_PATH_TEXT_PATTERN =
  /\b(failure|abusive|nonsense|privacy|refuse|wrong contact|high stakes|deescalation|no pricing|not a blocker|tool honesty)\b/i;
const NEGATIVE_PATH_OUTCOME_PATTERN =
  /(^failure_|^refuses_|^denies_|^no_|deescalation|explicit_failure|high_stakes|human_handoff|privacy|no_false|blocked|flagged|negative_path_handled)/i;

export type WaeScenarioActualVerdict = "PASSED" | "FAILED" | "SKIPPED";
export type WaeScenarioEvaluationStatus = "passed" | "failed";

export interface WaeScenarioObservedEvidence {
  actualVerdict: WaeScenarioActualVerdict;
  observedTools: string[];
  observedOutcomes: string[];
  reasonCodes: string[];
  skippedSubchecks: string[];
}

export interface WaeScenarioEvaluationResult {
  contractVersion: typeof WAE_SCENARIO_EXECUTION_CONTRACT_VERSION;
  scenarioId: string;
  agentId: string;
  expectedRuntimeVerdict: "RUN" | "SKIPPED";
  status: WaeScenarioEvaluationStatus;
  passed: boolean;
  reasonCodes: string[];
  checks: {
    missingRequiredToolsAllOf: string[];
    missingRequiredToolsAnyOf: boolean;
    forbiddenToolsUsed: string[];
    missingRequiredOutcomes: string[];
    missingSkippedSubchecks: string[];
    unexpectedSkippedSubchecks: string[];
    negativePathOutcomeMissing: boolean;
  };
}

export interface WaeScenarioAttemptArtifact {
  contractVersion: typeof WAE_SCENARIO_ATTEMPT_ARTIFACT_CONTRACT_VERSION;
  runId: string;
  scenarioId: string;
  agentId: string;
  executionMode: WaeScenarioDslRow["executionMode"];
  expectedRuntimeVerdict: "RUN" | "SKIPPED";
  actualVerdict: WaeScenarioActualVerdict;
  evaluationStatus: WaeScenarioEvaluationStatus;
  reasonCodes: string[];
  observedTools: string[];
  observedOutcomes: string[];
  skippedSubchecks: string[];
  performance: {
    latencyMs: number;
    costUsd: number;
    tokenCount: number;
    observedToolCount: number;
  };
  attempt: number;
  attemptKey: string;
  recordedAtMs: number;
}

export interface WaeScenarioAttemptIndexArtifact {
  contractVersion: typeof WAE_SCENARIO_ATTEMPT_INDEX_CONTRACT_VERSION;
  runId: string;
  scenarioId: string;
  latestAttempt: number;
  latestStatus: WaeScenarioEvaluationStatus;
  retainedAttempts: Array<{
    attempt: number;
    attemptKey: string;
    evaluationStatus: WaeScenarioEvaluationStatus;
    reasonCodes: string[];
    artifactPath: string;
  }>;
}

export interface WaeScenarioAttemptWriteResult {
  attemptArtifact: WaeScenarioAttemptArtifact;
  index: WaeScenarioAttemptIndexArtifact;
  attemptPath: string;
  latestPath: string;
  indexPath: string;
}

function normalizeLexicalValues(values: string[]): string[] {
  return collectLexicalReasonCodes(values);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hasIntersection(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function matchesNegativeOutcomePattern(outcome: string): boolean {
  return NEGATIVE_PATH_OUTCOME_PATTERN.test(outcome);
}

export function isNegativePathScenario(scenario: WaeScenarioDslRow): boolean {
  const searchable = [
    scenario.title,
    scenario.promptTemplate,
    ...scenario.requiredOutcomes,
  ].join(" ");
  return (
    NEGATIVE_PATH_TEXT_PATTERN.test(searchable)
    || scenario.requiredOutcomes.some((outcome) => matchesNegativeOutcomePattern(outcome))
  );
}

export function buildPassingScenarioEvidence(scenario: WaeScenarioDslRow): WaeScenarioObservedEvidence {
  if (scenario.runtime.verdict === "SKIPPED") {
    return {
      actualVerdict: "SKIPPED",
      observedTools: [],
      observedOutcomes: [],
      reasonCodes: normalizeLexicalValues([...scenario.runtime.reasonCodes]),
      skippedSubchecks: [],
    };
  }

  const observedTools = normalizeLexicalValues([
    ...scenario.requiredToolsAllOf,
    ...(scenario.requiredToolsAnyOf.length > 0 ? [scenario.requiredToolsAnyOf[0]] : []),
  ]);
  const observedOutcomes = normalizeLexicalValues([
    ...scenario.requiredOutcomes,
    ...(isNegativePathScenario(scenario)
      && !scenario.requiredOutcomes.some((outcome) => matchesNegativeOutcomePattern(outcome))
      ? ["negative_path_handled"]
      : []),
  ]);

  return {
    actualVerdict: "PASSED",
    observedTools,
    observedOutcomes,
    reasonCodes: [],
    skippedSubchecks: normalizeLexicalValues([...scenario.runtime.skippedSubchecks]),
  };
}

export function buildDeterministicWaeScenarioPerformance(args: {
  scenario: WaeScenarioDslRow;
  evidence: WaeScenarioObservedEvidence;
  attempt: number;
}): WaeScenarioAttemptArtifact["performance"] {
  const observedToolCount = normalizeLexicalValues([...args.evidence.observedTools]).length;
  const observedOutcomeCount = normalizeLexicalValues([...args.evidence.observedOutcomes]).length;
  const skippedSubcheckCount = normalizeLexicalValues([...args.evidence.skippedSubchecks]).length;
  const tokenCount =
    180
    + (observedToolCount * 55)
    + (observedOutcomeCount * 28)
    + (skippedSubcheckCount * 12)
    + (args.scenario.requiredToolsAllOf.length * 18)
    + (args.scenario.requiredOutcomes.length * 14)
    + (args.attempt * 7);
  const latencyMs =
    1_200
    + (observedToolCount * 420)
    + (observedOutcomeCount * 135)
    + (skippedSubcheckCount * 40)
    + (args.attempt * 25);
  const costUsd = roundTo((tokenCount * 0.0000065) + (observedToolCount * 0.0008), 6);

  return {
    latencyMs,
    costUsd,
    tokenCount,
    observedToolCount,
  };
}

export function evaluateWaeScenarioEvidence(args: {
  scenario: WaeScenarioDslRow;
  evidence: WaeScenarioObservedEvidence;
}): WaeScenarioEvaluationResult {
  const scenario = args.scenario;
  const evidence = args.evidence;
  const reasonCodes: string[] = [];
  const observedTools = normalizeLexicalValues([...evidence.observedTools]);
  const observedOutcomes = normalizeLexicalValues([...evidence.observedOutcomes]);
  const skippedSubchecks = normalizeLexicalValues([...evidence.skippedSubchecks]);

  const missingRequiredToolsAllOf = scenario.requiredToolsAllOf.filter(
    (requiredTool) => !observedTools.includes(requiredTool),
  );
  const missingRequiredToolsAnyOf =
    scenario.requiredToolsAnyOf.length > 0 && !hasIntersection(observedTools, scenario.requiredToolsAnyOf);
  const forbiddenToolsUsed = scenario.forbiddenTools.filter((forbiddenTool) =>
    observedTools.includes(forbiddenTool)
  );
  const missingRequiredOutcomes = scenario.requiredOutcomes.filter((requiredOutcome) =>
    !observedOutcomes.includes(requiredOutcome)
  );
  const missingSkippedSubchecks = scenario.runtime.skippedSubchecks.filter(
    (subcheck) => !skippedSubchecks.includes(subcheck),
  );
  const unexpectedSkippedSubchecks = skippedSubchecks.filter(
    (subcheck) => !scenario.runtime.skippedSubchecks.includes(subcheck),
  );
  const negativePathOutcomeMissing =
    isNegativePathScenario(scenario) && !observedOutcomes.some((outcome) => matchesNegativeOutcomePattern(outcome));

  if (scenario.runtime.verdict === "SKIPPED") {
    if (evidence.actualVerdict !== "SKIPPED") {
      reasonCodes.push("expected_skipped_verdict");
    }
    if (observedTools.length > 0) {
      reasonCodes.push("skipped_scenario_executed_tools");
    }
    if (observedOutcomes.length > 0) {
      reasonCodes.push("skipped_scenario_emitted_outcomes");
    }

    const expectedSkipReasonCodes = normalizeLexicalValues([...scenario.runtime.reasonCodes]);
    const actualSkipReasonCodes = normalizeLexicalValues([...evidence.reasonCodes]);
    const missingSkipReasonCodes = expectedSkipReasonCodes.filter(
      (reasonCode) => !actualSkipReasonCodes.includes(reasonCode),
    );
    const unexpectedSkipReasonCodes = actualSkipReasonCodes.filter(
      (reasonCode) => !expectedSkipReasonCodes.includes(reasonCode),
    );

    for (const missingReasonCode of missingSkipReasonCodes) {
      reasonCodes.push(`missing_skip_reason:${missingReasonCode}`);
    }
    for (const unexpectedReasonCode of unexpectedSkipReasonCodes) {
      reasonCodes.push(`unexpected_skip_reason:${unexpectedReasonCode}`);
    }
  } else {
    if (evidence.actualVerdict === "SKIPPED") {
      reasonCodes.push("unexpected_skipped_verdict");
    }
    if (evidence.actualVerdict === "FAILED") {
      reasonCodes.push("unexpected_failed_verdict");
    }
    for (const toolName of missingRequiredToolsAllOf) {
      reasonCodes.push(`missing_required_tool:${toolName}`);
    }
    if (missingRequiredToolsAnyOf) {
      reasonCodes.push("missing_required_any_tool");
    }
    for (const toolName of forbiddenToolsUsed) {
      reasonCodes.push(`forbidden_tool_used:${toolName}`);
    }
    for (const outcome of missingRequiredOutcomes) {
      reasonCodes.push(`missing_required_outcome:${outcome}`);
    }
    for (const subcheck of missingSkippedSubchecks) {
      reasonCodes.push(`missing_skipped_subcheck:${subcheck}`);
    }
    for (const subcheck of unexpectedSkippedSubchecks) {
      reasonCodes.push(`unexpected_skipped_subcheck:${subcheck}`);
    }
    if (negativePathOutcomeMissing) {
      reasonCodes.push("negative_path_outcome_missing");
    }
  }

  const lexicalReasonCodes = normalizeLexicalValues(reasonCodes);

  return {
    contractVersion: WAE_SCENARIO_EXECUTION_CONTRACT_VERSION,
    scenarioId: scenario.id,
    agentId: scenario.agentId,
    expectedRuntimeVerdict: scenario.runtime.verdict,
    status: lexicalReasonCodes.length === 0 ? "passed" : "failed",
    passed: lexicalReasonCodes.length === 0,
    reasonCodes: lexicalReasonCodes,
    checks: {
      missingRequiredToolsAllOf,
      missingRequiredToolsAnyOf,
      forbiddenToolsUsed,
      missingRequiredOutcomes,
      missingSkippedSubchecks,
      unexpectedSkippedSubchecks,
      negativePathOutcomeMissing,
    },
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function buildWaeScenarioAttemptKey(args: {
  runId: string;
  scenarioId: string;
  attempt: number;
}): string {
  return sha256(`${args.runId}|${args.scenarioId}|${args.attempt}`).slice(0, 16);
}

export function buildWaeDeterministicAttemptTimestampMs(args: {
  runId: string;
  scenarioId: string;
  attempt: number;
}): number {
  const hash = sha256(`${args.runId}|${args.scenarioId}|${args.attempt}|recorded_at`).slice(0, 12);
  const offset = Number.parseInt(hash, 16) % 100_000_000;
  return 1_760_000_000_000 + offset;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function loadRetainedAttemptArtifacts(
  attemptsDir: string,
): Promise<Array<{ artifact: WaeScenarioAttemptArtifact; artifactPath: string }>> {
  try {
    const entries = await fs.readdir(attemptsDir, { withFileTypes: true });
    const loaded: Array<{ artifact: WaeScenarioAttemptArtifact; artifactPath: string }> = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }
      const artifactPath = path.join(attemptsDir, entry.name);
      const parsed = JSON.parse(await fs.readFile(artifactPath, "utf8")) as WaeScenarioAttemptArtifact;
      if (typeof parsed.attempt === "number" && Number.isFinite(parsed.attempt)) {
        loaded.push({ artifact: parsed, artifactPath });
      }
    }

    return loaded;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function executeWaeScenarioAttempt(args: {
  runId: string;
  scenario: WaeScenarioDslRow;
  evidence: WaeScenarioObservedEvidence;
  attempt: number;
  reportsRoot?: string;
  recordedAtMs?: number;
  performance?: WaeScenarioAttemptArtifact["performance"];
}): Promise<WaeScenarioAttemptWriteResult & { evaluation: WaeScenarioEvaluationResult }> {
  const evaluation = evaluateWaeScenarioEvidence({
    scenario: args.scenario,
    evidence: args.evidence,
  });

  const reportsRoot =
    args.reportsRoot ?? path.join(process.cwd(), "tmp", "reports", "wae");
  const scenarioRoot = path.join(reportsRoot, args.runId, "scenarios", args.scenario.id);
  const attemptsDir = path.join(scenarioRoot, "attempts");
  const attemptPath = path.join(
    attemptsDir,
    `attempt-${String(args.attempt).padStart(2, "0")}.json`,
  );
  const latestPath = path.join(scenarioRoot, "latest.json");
  const indexPath = path.join(scenarioRoot, "attempt-index.json");

  await fs.mkdir(attemptsDir, { recursive: true });

  const attemptArtifact: WaeScenarioAttemptArtifact = {
    contractVersion: WAE_SCENARIO_ATTEMPT_ARTIFACT_CONTRACT_VERSION,
    runId: args.runId,
    scenarioId: args.scenario.id,
    agentId: args.scenario.agentId,
    executionMode: args.scenario.executionMode,
    expectedRuntimeVerdict: args.scenario.runtime.verdict,
    actualVerdict: args.evidence.actualVerdict,
    evaluationStatus: evaluation.status,
    reasonCodes: evaluation.reasonCodes,
    observedTools: normalizeLexicalValues([...args.evidence.observedTools]),
    observedOutcomes: normalizeLexicalValues([...args.evidence.observedOutcomes]),
    skippedSubchecks: normalizeLexicalValues([...args.evidence.skippedSubchecks]),
    performance:
      args.performance
      ?? buildDeterministicWaeScenarioPerformance({
        scenario: args.scenario,
        evidence: args.evidence,
        attempt: args.attempt,
      }),
    attempt: args.attempt,
    attemptKey: buildWaeScenarioAttemptKey({
      runId: args.runId,
      scenarioId: args.scenario.id,
      attempt: args.attempt,
    }),
    recordedAtMs:
      args.recordedAtMs
      ?? buildWaeDeterministicAttemptTimestampMs({
        runId: args.runId,
        scenarioId: args.scenario.id,
        attempt: args.attempt,
      }),
  };

  await writeJson(attemptPath, attemptArtifact);

  const retainedAttemptsMap = new Map<number, { artifact: WaeScenarioAttemptArtifact; artifactPath: string }>();
  const retained = await loadRetainedAttemptArtifacts(attemptsDir);
  for (const retainedAttempt of retained) {
    retainedAttemptsMap.set(retainedAttempt.artifact.attempt, retainedAttempt);
  }
  retainedAttemptsMap.set(args.attempt, { artifact: attemptArtifact, artifactPath: attemptPath });

  const retainedAttempts = Array.from(retainedAttemptsMap.values()).sort(
    (left, right) => left.artifact.attempt - right.artifact.attempt,
  );
  const latestAttemptArtifact = retainedAttempts[retainedAttempts.length - 1]?.artifact ?? attemptArtifact;

  const index: WaeScenarioAttemptIndexArtifact = {
    contractVersion: WAE_SCENARIO_ATTEMPT_INDEX_CONTRACT_VERSION,
    runId: args.runId,
    scenarioId: args.scenario.id,
    latestAttempt: latestAttemptArtifact.attempt,
    latestStatus: latestAttemptArtifact.evaluationStatus,
    retainedAttempts: retainedAttempts.map((item) => ({
      attempt: item.artifact.attempt,
      attemptKey: item.artifact.attemptKey,
      evaluationStatus: item.artifact.evaluationStatus,
      reasonCodes: item.artifact.reasonCodes,
      artifactPath: item.artifactPath,
    })),
  };

  await writeJson(indexPath, index);
  await writeJson(latestPath, latestAttemptArtifact);

  return {
    evaluation,
    attemptArtifact,
    index,
    attemptPath,
    latestPath,
    indexPath,
  };
}
