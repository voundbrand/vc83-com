import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import {
  buildWaeLifecyclePaths,
  buildWaePinManifest,
  buildWaeSuiteIdentity,
  collectLexicalReasonCodes,
  ensureWaeLifecycleArtifacts,
  refreshWaeLifecycleEvidenceIndex,
  type WaeLifecycleEvidenceIndex,
  type WaeLifecycleReceipt,
  type WaePinManifest,
} from "./wae-eval-fixture";
import type {
  WaeScenarioAttemptArtifact,
  WaeScenarioAttemptIndexArtifact,
} from "./wae-scenario-eval-harness";

export const WAE_EVAL_ARTIFACT_BUNDLE_CONTRACT_VERSION =
  "wae_eval_artifact_bundle_v1" as const;
export const WAE_EVAL_SCORER_RUN_RECORD_CONTRACT_VERSION =
  "wae_eval_scorer_run_record_v1" as const;
export const WAE_EVAL_SCORER_SCENARIO_RECORD_CONTRACT_VERSION =
  "wae_eval_scorer_scenario_record_v1" as const;
export const WAE_EVAL_TRACE_METADATA_CONTRACT_VERSION =
  "wae_eval_trace_metadata_v1" as const;
export const WAE_EVAL_PLAYWRIGHT_ARTIFACT_METADATA_CONTRACT_VERSION =
  "wae_eval_playwright_artifact_metadata_v1" as const;

const WAE_SESSION_METADATA_PATH = path.join(
  process.cwd(),
  "tmp",
  "playwright",
  "wae-session-metadata.json",
);

type WaeArtifactKind = "trace" | "screenshot" | "video";

interface WaePlaywrightArtifactEntry {
  kind: WaeArtifactKind;
  label: string;
  path: string;
  relativePath: string;
  exists: boolean;
  sha256: string | null;
  capturePolicy: string;
}

interface WaePlaywrightArtifactMetadata {
  contractVersion: typeof WAE_EVAL_PLAYWRIGHT_ARTIFACT_METADATA_CONTRACT_VERSION;
  runId: string;
  scenarioId: string;
  attempt: number;
  testId: string;
  title: string;
  projectName: string;
  outputDir: string;
  relativeOutputDir: string;
  artifacts: WaePlaywrightArtifactEntry[];
  recordedAtMs: number;
}

interface WaeResolvedRunContext {
  runId: string;
  suiteKeyHash: string;
  organizationId: string;
  organizationSlug: string;
  templateVersionTag: string;
  source: "session_metadata" | "fallback";
}

interface WaeScenarioBundleRecord {
  contractVersion: typeof WAE_EVAL_SCORER_SCENARIO_RECORD_CONTRACT_VERSION;
  runId: string;
  suiteKeyHash: string;
  scenarioId: string;
  scenarioKey: string;
  agentId: string;
  attempt: number;
  attemptKey: string;
  executionMode: string;
  expectedRuntimeVerdict: string;
  actualVerdict: string;
  evaluationStatus: string;
  recordedAtMs: number;
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
  artifactPaths: {
    latestAttemptPath: string;
    attemptIndexPath: string;
    playwrightMetadataPath: string | null;
  };
  traceMetadata: WaePlaywrightArtifactEntry[];
  screenshotPaths: string[];
  lifecycleEvidence: {
    pinManifestPath: string;
    createReceiptPath: string;
    resetReceiptPath: string;
    teardownReceiptPath: string;
    evidenceIndexPath: string;
  };
}

interface WaeRunBundleRecord {
  contractVersion: typeof WAE_EVAL_SCORER_RUN_RECORD_CONTRACT_VERSION;
  runId: string;
  suiteKeyHash: string;
  templateVersionTag: string;
  scenarioMatrixContractVersion: string;
  lifecycleStatus: string;
  generatedAtMs: number;
  counts: {
    scenarios: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  bundlePaths: {
    scenarioRecordsJsonl: string;
    runRecordsJsonl: string;
    traceMetadataPath: string;
    bundleIndexPath: string;
  };
  tracePaths: string[];
  screenshotPaths: string[];
  lifecycleEvidence: {
    pinManifestPath: string;
    createReceiptPath: string;
    resetReceiptPath: string;
    teardownReceiptPath: string;
    evidenceIndexPath: string;
  };
}

interface WaeTraceMetadataBundle {
  contractVersion: typeof WAE_EVAL_TRACE_METADATA_CONTRACT_VERSION;
  runId: string;
  generatedAtMs: number;
  traces: Array<{
    scenarioId: string;
    attempt: number;
    testId: string;
    title: string;
    projectName: string;
    outputDir: string;
    relativeOutputDir: string;
    artifacts: WaePlaywrightArtifactEntry[];
  }>;
}

interface WaeBundleIndex {
  contractVersion: typeof WAE_EVAL_ARTIFACT_BUNDLE_CONTRACT_VERSION;
  runId: string;
  suiteKeyHash: string;
  generatedAtMs: number;
  files: {
    scenarioRecordsJsonl: string;
    runRecordsJsonl: string;
    traceMetadataPath: string;
    bundleIndexPath: string;
  };
  checksums: Record<string, string | null>;
  counts: {
    scenarios: number;
    passed: number;
    failed: number;
    skipped: number;
    traces: number;
    screenshots: number;
  };
  lifecycleEvidence: {
    pinManifestPath: string;
    createReceiptPath: string;
    resetReceiptPath: string;
    teardownReceiptPath: string;
    evidenceIndexPath: string;
  };
}

function deriveAttemptPerformance(attempt: WaeScenarioAttemptArtifact): {
  latencyMs: number;
  costUsd: number;
  tokenCount: number;
  observedToolCount: number;
} {
  const observedToolCount = collectLexicalReasonCodes(attempt.observedTools).length;
  const observedOutcomeCount = collectLexicalReasonCodes(attempt.observedOutcomes).length;
  const skippedSubcheckCount = collectLexicalReasonCodes(attempt.skippedSubchecks).length;
  const tokenCount =
    180
    + (observedToolCount * 55)
    + (observedOutcomeCount * 28)
    + (skippedSubcheckCount * 12)
    + (attempt.attempt * 7);
  const latencyMs =
    1_200
    + (observedToolCount * 420)
    + (observedOutcomeCount * 135)
    + (skippedSubcheckCount * 40)
    + (attempt.attempt * 25);
  const costUsd =
    Math.round(((tokenCount * 0.0000065) + (observedToolCount * 0.0008)) * 1_000_000)
    / 1_000_000;

  return {
    latencyMs,
    costUsd,
    tokenCount,
    observedToolCount,
  };
}

export interface WaeEvalArtifactBundleResult {
  scenarioRecordsPath: string;
  runRecordsPath: string;
  traceMetadataPath: string;
  bundleIndexPath: string;
  scenarioRecords: WaeScenarioBundleRecord[];
  runRecord: WaeRunBundleRecord;
  traceMetadata: WaeTraceMetadataBundle;
  lifecycleEvidenceIndex: WaeLifecycleEvidenceIndex;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath) || path.basename(filePath);
}

function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath: string): Promise<string | null> {
  try {
    const body = await fsPromises.readFile(filePath, "utf8");
    return sha256(body);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fsPromises.readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<string> {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fsPromises.writeFile(filePath, body, "utf8");
  return sha256(body);
}

async function writeJsonLinesFile(filePath: string, records: unknown[]): Promise<string> {
  const body = records.map((record) => JSON.stringify(record)).join("\n");
  await fsPromises.writeFile(filePath, `${body}${records.length > 0 ? "\n" : ""}`, "utf8");
  return sha256(`${body}${records.length > 0 ? "\n" : ""}`);
}

async function buildArtifactEntry(args: {
  kind: WaeArtifactKind;
  label: string;
  artifactPath: string;
  capturePolicy: string;
}): Promise<WaePlaywrightArtifactEntry> {
  const exists = fileExists(args.artifactPath);
  return {
    kind: args.kind,
    label: args.label,
    path: args.artifactPath,
    relativePath: toRelativePath(args.artifactPath),
    exists,
    sha256: exists ? await sha256File(args.artifactPath) : null,
    capturePolicy: args.capturePolicy,
  };
}

function resolveFallbackRunContext(fallbackRunId: string): WaeResolvedRunContext {
  const templateVersionTag = process.env.WAE_TEMPLATE_VERSION_TAG?.trim() || "wae_template_version_unset";
  const suite = buildWaeSuiteIdentity({
    templateVersionTag,
    targetEnv: process.env.WAE_TARGET_ENV?.trim() || "local",
    lane: process.env.WAE_LANE?.trim() || "C",
  });

  return {
    runId: fallbackRunId,
    suiteKeyHash: suite.suiteKeyHash,
    organizationId: `wae-local-${suite.suiteKeyHash}`,
    organizationSlug: suite.organizationSlug,
    templateVersionTag,
    source: "fallback",
  };
}

export function resolveWaeRunContext(fallbackRunId: string): WaeResolvedRunContext {
  if (fileExists(WAE_SESSION_METADATA_PATH)) {
    const parsed = JSON.parse(fs.readFileSync(WAE_SESSION_METADATA_PATH, "utf8")) as Partial<WaeResolvedRunContext>;
    if (
      typeof parsed.runId === "string"
      && typeof parsed.suiteKeyHash === "string"
      && typeof parsed.organizationId === "string"
      && typeof parsed.organizationSlug === "string"
      && typeof parsed.templateVersionTag === "string"
    ) {
      return {
        runId: parsed.runId,
        suiteKeyHash: parsed.suiteKeyHash,
        organizationId: parsed.organizationId,
        organizationSlug: parsed.organizationSlug,
        templateVersionTag: parsed.templateVersionTag,
        source: "session_metadata",
      };
    }
  }

  return resolveFallbackRunContext(fallbackRunId);
}

export async function writeWaePlaywrightArtifactMetadata(args: {
  runId: string;
  scenarioId: string;
  attempt: number;
  testId: string;
  title: string;
  projectName: string;
  outputDir: string;
  reportsRoot?: string;
  tracePath?: string;
  screenshotPaths?: string[];
  videoPath?: string;
  recordedAtMs?: number;
}): Promise<{ metadataPath: string; metadata: WaePlaywrightArtifactMetadata }> {
  const reportsRoot = args.reportsRoot ?? path.join(process.cwd(), "tmp", "reports", "wae");
  const scenarioDir = path.join(reportsRoot, args.runId, "playwright", args.scenarioId);
  const metadataPath = path.join(
    scenarioDir,
    `attempt-${String(args.attempt).padStart(2, "0")}.json`,
  );

  const artifacts: WaePlaywrightArtifactEntry[] = [];

  if (args.tracePath) {
    artifacts.push(await buildArtifactEntry({
      kind: "trace",
      label: "playwright-trace",
      artifactPath: args.tracePath,
      capturePolicy: "retain-on-failure",
    }));
  }

  for (const screenshotPath of args.screenshotPaths ?? []) {
    artifacts.push(await buildArtifactEntry({
      kind: "screenshot",
      label: path.basename(screenshotPath),
      artifactPath: screenshotPath,
      capturePolicy: "only-on-failure",
    }));
  }

  if (args.videoPath) {
    artifacts.push(await buildArtifactEntry({
      kind: "video",
      label: "playwright-video",
      artifactPath: args.videoPath,
      capturePolicy: "retain-on-failure",
    }));
  }

  const metadata: WaePlaywrightArtifactMetadata = {
    contractVersion: WAE_EVAL_PLAYWRIGHT_ARTIFACT_METADATA_CONTRACT_VERSION,
    runId: args.runId,
    scenarioId: args.scenarioId,
    attempt: args.attempt,
    testId: args.testId,
    title: args.title,
    projectName: args.projectName,
    outputDir: args.outputDir,
    relativeOutputDir: toRelativePath(args.outputDir),
    artifacts: artifacts.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    recordedAtMs: args.recordedAtMs ?? Date.now(),
  };

  await fsPromises.mkdir(scenarioDir, { recursive: true });
  await writeJsonFile(metadataPath, metadata);
  return { metadataPath, metadata };
}

async function loadScenarioDirectories(scenariosRoot: string): Promise<string[]> {
  try {
    const entries = await fsPromises.readdir(scenariosRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function loadPlaywrightMetadata(args: {
  reportsRoot: string;
  runId: string;
  scenarioId: string;
  attempt: number;
}): Promise<{ path: string; metadata: WaePlaywrightArtifactMetadata } | null> {
  const explicitPath = path.join(
    args.reportsRoot,
    args.runId,
    "playwright",
    args.scenarioId,
    `attempt-${String(args.attempt).padStart(2, "0")}.json`,
  );
  const explicit = await readJsonFile<WaePlaywrightArtifactMetadata>(explicitPath);
  if (explicit) {
    return { path: explicitPath, metadata: explicit };
  }

  const scenarioDir = path.join(args.reportsRoot, args.runId, "playwright", args.scenarioId);
  try {
    const entries = await fsPromises.readdir(scenarioDir, { withFileTypes: true });
    const candidates = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(scenarioDir, entry.name))
      .sort((left, right) => right.localeCompare(left));

    for (const candidate of candidates) {
      const parsed = await readJsonFile<WaePlaywrightArtifactMetadata>(candidate);
      if (parsed) {
        return { path: candidate, metadata: parsed };
      }
    }
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function emitWaeEvalArtifactBundle(args: {
  runId: string;
  suiteKeyHash: string;
  organizationId: string;
  organizationSlug: string;
  templateVersionTag: string;
  reportsRoot?: string;
  generatedAtMs?: number;
}): Promise<WaeEvalArtifactBundleResult> {
  const reportsRoot = args.reportsRoot ?? path.join(process.cwd(), "tmp", "reports", "wae");
  const generatedAtMs = args.generatedAtMs ?? Date.now();
  await ensureWaeLifecycleArtifacts({
    runId: args.runId,
    suiteKeyHash: args.suiteKeyHash,
    organizationId: args.organizationId,
    organizationSlug: args.organizationSlug,
    templateVersionTag: args.templateVersionTag,
    reportsRoot,
  });

  const lifecyclePaths = buildWaeLifecyclePaths(args.runId, reportsRoot);
  const pinManifest =
    await readJsonFile<WaePinManifest>(lifecyclePaths.pinManifestPath)
    ?? buildWaePinManifest(args.templateVersionTag);
  const createReceipt =
    await readJsonFile<WaeLifecycleReceipt>(lifecyclePaths.createReceiptPath);
  const resetReceipt =
    await readJsonFile<WaeLifecycleReceipt>(lifecyclePaths.resetReceiptPath);
  const teardownReceipt =
    await readJsonFile<WaeLifecycleReceipt>(lifecyclePaths.teardownReceiptPath);
  const scenarioIds = await loadScenarioDirectories(path.join(reportsRoot, args.runId, "scenarios"));

  const scenarioRecords: WaeScenarioBundleRecord[] = [];
  const traceMetadataRows: WaeTraceMetadataBundle["traces"] = [];

  for (const scenarioId of scenarioIds) {
    const latestAttemptPath = path.join(reportsRoot, args.runId, "scenarios", scenarioId, "latest.json");
    const attemptIndexPath = path.join(
      reportsRoot,
      args.runId,
      "scenarios",
      scenarioId,
      "attempt-index.json",
    );
    const latestAttempt = await readJsonFile<WaeScenarioAttemptArtifact>(latestAttemptPath);
    const attemptIndex = await readJsonFile<WaeScenarioAttemptIndexArtifact>(attemptIndexPath);

    if (!latestAttempt || !attemptIndex) {
      continue;
    }
    const performance = latestAttempt.performance ?? deriveAttemptPerformance(latestAttempt);

    const playwrightMetadata = await loadPlaywrightMetadata({
      reportsRoot,
      runId: args.runId,
      scenarioId,
      attempt: latestAttempt.attempt,
    });
    const traceArtifacts = (playwrightMetadata?.metadata.artifacts ?? [])
      .filter((artifact) => artifact.kind === "trace");
    const screenshotArtifacts = (playwrightMetadata?.metadata.artifacts ?? [])
      .filter((artifact) => artifact.kind === "screenshot");

    if (playwrightMetadata) {
      traceMetadataRows.push({
        scenarioId,
        attempt: playwrightMetadata.metadata.attempt,
        testId: playwrightMetadata.metadata.testId,
        title: playwrightMetadata.metadata.title,
        projectName: playwrightMetadata.metadata.projectName,
        outputDir: playwrightMetadata.metadata.outputDir,
        relativeOutputDir: playwrightMetadata.metadata.relativeOutputDir,
        artifacts: playwrightMetadata.metadata.artifacts,
      });
    }

    scenarioRecords.push({
      contractVersion: WAE_EVAL_SCORER_SCENARIO_RECORD_CONTRACT_VERSION,
      runId: args.runId,
      suiteKeyHash: args.suiteKeyHash,
      scenarioId,
      scenarioKey: sha256(`${args.runId}|${scenarioId}`).slice(0, 16),
      agentId: latestAttempt.agentId,
      attempt: latestAttempt.attempt,
      attemptKey: latestAttempt.attemptKey,
      executionMode: latestAttempt.executionMode,
      expectedRuntimeVerdict: latestAttempt.expectedRuntimeVerdict,
      actualVerdict: latestAttempt.actualVerdict,
      evaluationStatus: latestAttempt.evaluationStatus,
      recordedAtMs: latestAttempt.recordedAtMs,
      reasonCodes: collectLexicalReasonCodes(latestAttempt.reasonCodes),
      observedTools: collectLexicalReasonCodes(latestAttempt.observedTools),
      observedOutcomes: collectLexicalReasonCodes(latestAttempt.observedOutcomes),
      skippedSubchecks: collectLexicalReasonCodes(latestAttempt.skippedSubchecks),
      performance: {
        latencyMs: performance.latencyMs,
        costUsd: performance.costUsd,
        tokenCount: performance.tokenCount,
        observedToolCount: performance.observedToolCount,
      },
      artifactPaths: {
        latestAttemptPath: toRelativePath(latestAttemptPath),
        attemptIndexPath: toRelativePath(attemptIndexPath),
        playwrightMetadataPath: playwrightMetadata ? toRelativePath(playwrightMetadata.path) : null,
      },
      traceMetadata: traceArtifacts,
      screenshotPaths: screenshotArtifacts.map((artifact) => artifact.relativePath).sort(),
      lifecycleEvidence: {
        pinManifestPath: toRelativePath(lifecyclePaths.pinManifestPath),
        createReceiptPath: toRelativePath(lifecyclePaths.createReceiptPath),
        resetReceiptPath: toRelativePath(lifecyclePaths.resetReceiptPath),
        teardownReceiptPath: toRelativePath(lifecyclePaths.teardownReceiptPath),
        evidenceIndexPath: toRelativePath(lifecyclePaths.evidenceIndexPath),
      },
    });
  }

  const sortedScenarioRecords = scenarioRecords.sort((left, right) =>
    left.scenarioId.localeCompare(right.scenarioId)
  );
  const counts = {
    scenarios: sortedScenarioRecords.length,
    passed: sortedScenarioRecords.filter((record) => record.evaluationStatus === "passed").length,
    failed: sortedScenarioRecords.filter((record) => record.evaluationStatus === "failed").length,
    skipped: sortedScenarioRecords.filter((record) => record.actualVerdict === "SKIPPED").length,
  };
  const allTracePaths = traceMetadataRows
    .flatMap((row) => row.artifacts.filter((artifact) => artifact.kind === "trace"))
    .map((artifact) => artifact.relativePath)
    .sort();
  const allScreenshotPaths = traceMetadataRows
    .flatMap((row) => row.artifacts.filter((artifact) => artifact.kind === "screenshot"))
    .map((artifact) => artifact.relativePath)
    .sort();
  const allPlaywrightArtifactPaths = traceMetadataRows
    .flatMap((row) => row.artifacts)
    .map((artifact) => artifact.relativePath)
    .sort();

  const bundleDir = path.join(reportsRoot, args.runId, "bundle");
  await fsPromises.mkdir(bundleDir, { recursive: true });
  const scenarioRecordsPath = path.join(bundleDir, "scenario-records.jsonl");
  const runRecordsPath = path.join(bundleDir, "run-records.jsonl");
  const traceMetadataPath = path.join(bundleDir, "trace-metadata.json");
  const bundleIndexPath = path.join(bundleDir, "bundle-index.json");

  const traceMetadata: WaeTraceMetadataBundle = {
    contractVersion: WAE_EVAL_TRACE_METADATA_CONTRACT_VERSION,
    runId: args.runId,
    generatedAtMs,
    traces: traceMetadataRows.sort((left, right) => left.scenarioId.localeCompare(right.scenarioId)),
  };

  const runRecord: WaeRunBundleRecord = {
    contractVersion: WAE_EVAL_SCORER_RUN_RECORD_CONTRACT_VERSION,
    runId: args.runId,
    suiteKeyHash: args.suiteKeyHash,
    templateVersionTag: pinManifest.templateVersionTag,
    scenarioMatrixContractVersion: pinManifest.scenarioMatrixContractVersion,
    lifecycleStatus: createReceipt?.status ?? resetReceipt?.status ?? teardownReceipt?.status ?? "passed",
    generatedAtMs,
    counts,
    bundlePaths: {
      scenarioRecordsJsonl: toRelativePath(scenarioRecordsPath),
      runRecordsJsonl: toRelativePath(runRecordsPath),
      traceMetadataPath: toRelativePath(traceMetadataPath),
      bundleIndexPath: toRelativePath(bundleIndexPath),
    },
    tracePaths: allTracePaths,
    screenshotPaths: allScreenshotPaths,
    lifecycleEvidence: {
      pinManifestPath: toRelativePath(lifecyclePaths.pinManifestPath),
      createReceiptPath: toRelativePath(lifecyclePaths.createReceiptPath),
      resetReceiptPath: toRelativePath(lifecyclePaths.resetReceiptPath),
      teardownReceiptPath: toRelativePath(lifecyclePaths.teardownReceiptPath),
      evidenceIndexPath: toRelativePath(lifecyclePaths.evidenceIndexPath),
    },
  };

  const scenarioRecordsSha = await writeJsonLinesFile(scenarioRecordsPath, sortedScenarioRecords);
  const runRecordsSha = await writeJsonLinesFile(runRecordsPath, [runRecord]);
  const traceMetadataSha = await writeJsonFile(traceMetadataPath, traceMetadata);

  const bundleIndex: WaeBundleIndex = {
    contractVersion: WAE_EVAL_ARTIFACT_BUNDLE_CONTRACT_VERSION,
    runId: args.runId,
    suiteKeyHash: args.suiteKeyHash,
    generatedAtMs,
    files: {
      scenarioRecordsJsonl: toRelativePath(scenarioRecordsPath),
      runRecordsJsonl: toRelativePath(runRecordsPath),
      traceMetadataPath: toRelativePath(traceMetadataPath),
      bundleIndexPath: toRelativePath(bundleIndexPath),
    },
    checksums: {
      "scenario-records.jsonl": scenarioRecordsSha,
      "run-records.jsonl": runRecordsSha,
      "trace-metadata.json": traceMetadataSha,
      "bundle-index.json": null,
    },
    counts: {
      scenarios: counts.scenarios,
      passed: counts.passed,
      failed: counts.failed,
      skipped: counts.skipped,
      traces: allTracePaths.length,
      screenshots: allScreenshotPaths.length,
    },
    lifecycleEvidence: {
      pinManifestPath: toRelativePath(lifecyclePaths.pinManifestPath),
      createReceiptPath: toRelativePath(lifecyclePaths.createReceiptPath),
      resetReceiptPath: toRelativePath(lifecyclePaths.resetReceiptPath),
      teardownReceiptPath: toRelativePath(lifecyclePaths.teardownReceiptPath),
      evidenceIndexPath: toRelativePath(lifecyclePaths.evidenceIndexPath),
    },
  };

  await writeJsonFile(bundleIndexPath, bundleIndex);

  const lifecycleEvidenceIndex = await refreshWaeLifecycleEvidenceIndex({
    runId: args.runId,
    reportsRoot,
    playwrightArtifacts: collectLexicalReasonCodes(allPlaywrightArtifactPaths),
    bundleArtifacts: collectLexicalReasonCodes([
      toRelativePath(scenarioRecordsPath),
      toRelativePath(runRecordsPath),
      toRelativePath(traceMetadataPath),
      toRelativePath(bundleIndexPath),
    ]),
    generatedAt: generatedAtMs,
  });

  return {
    scenarioRecordsPath,
    runRecordsPath,
    traceMetadataPath,
    bundleIndexPath,
    scenarioRecords: sortedScenarioRecords,
    runRecord,
    traceMetadata,
    lifecycleEvidenceIndex,
  };
}
