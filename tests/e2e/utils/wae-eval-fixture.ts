import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION =
  "wae_eval_org_lifecycle_v1" as const;
export const WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION =
  "wae_eval_scenario_matrix_v1" as const;
export const WAE_AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION =
  "ath_template_lifecycle_v1" as const;
export const WAE_LIFECYCLE_EVIDENCE_CONTRACT_VERSION =
  "wae_eval_lifecycle_evidence_v1" as const;

export const WAE_EVAL_PINNED_INPUTS = {
  seedScript: {
    seedAll: {
      path: "scripts/seed-all.sh",
      sha256: "10ea9d7df1d3e5557310d9ef73c78bacbb334684cce206d7d19bf7d12b3506bd",
    },
    reseed: {
      path: "scripts/reseed-all-l4yercak3.sh",
      sha256: "5a533ae127bff5846cb5595439e8b376d7657d308c1a3bca958c6473051f57cd",
    },
  },
  scenarioMatrix: {
    sha256: "a6a645c16ba03f3e985ebeaa47be5eafd3257ec1de801e2d9b8f559e36a3df6f",
  },
  agentOntology: {
    sha256: "a02d5b63feb8cdafafbc29aac3560b5dfe2d1f1d04e7861e7484a21c41d9bb84",
  },
} as const;

export type WaeLifecycleStatus = "passed" | "failed" | "blocked";

export interface WaeSuiteIdentity {
  suiteKeyInput: string;
  suiteKeyHash: string;
  organizationSlug: string;
  organizationName: string;
  adminEmail: string;
}

export interface WaePinManifest {
  lifecycleContractVersion: typeof WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION;
  scenarioMatrixContractVersion: typeof WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION;
  agentTemplateLifecycleContractVersion: typeof WAE_AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION;
  seedScript: typeof WAE_EVAL_PINNED_INPUTS.seedScript;
  scenarioMatrix: typeof WAE_EVAL_PINNED_INPUTS.scenarioMatrix;
  agentOntology: typeof WAE_EVAL_PINNED_INPUTS.agentOntology;
  templateVersionTag: string;
}

export interface WaeLifecycleReceipt {
  runId: string;
  suiteKeyHash: string;
  organizationId: string;
  organizationSlug: string;
  templateVersionTag: string;
  scenarioMatrixContractVersion: typeof WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION;
  status: WaeLifecycleStatus;
  reasonCodes: string[];
  attempt: number;
  timestamp: number;
  mode?: "replay_preserve" | "archive_org";
  preCount?: number;
  postCount?: number;
}

export interface WaeLifecyclePaths {
  rootDir: string;
  pinManifestPath: string;
  createReceiptPath: string;
  resetReceiptPath: string;
  teardownReceiptPath: string;
  evidenceIndexPath: string;
}

export interface WaeLifecycleEvidenceIndex {
  runId: string;
  contractVersion: typeof WAE_LIFECYCLE_EVIDENCE_CONTRACT_VERSION;
  checksums: Record<string, string | null>;
  artifacts: {
    playwright: string[];
    bundle: string[];
  };
  generatedAt: number;
}

export interface WaeLifecycleArtifactsInput {
  runId: string;
  pinManifest: WaePinManifest;
  createReceipt: WaeLifecycleReceipt;
  resetReceipt: WaeLifecycleReceipt;
  teardownReceipt: WaeLifecycleReceipt;
  playwrightArtifacts?: string[];
  bundleArtifacts?: string[];
  reportsRoot?: string;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function collectLexicalReasonCodes(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeNonEmptyString(value))
        .filter((value): value is string => Boolean(value))
    )
  ).sort();
}

export function buildWaeSuiteIdentity(args: {
  templateVersionTag: string;
  targetEnv: string;
  lane: string;
}): WaeSuiteIdentity {
  const suiteKeyInput = [
    WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
    WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION,
    args.templateVersionTag,
    args.targetEnv,
    args.lane,
  ].join("|");
  const suiteKeyHash = sha256(suiteKeyInput).slice(0, 16);
  return {
    suiteKeyInput,
    suiteKeyHash,
    organizationSlug: `pw-wae-${suiteKeyHash}`,
    organizationName: `Playwright WAE ${suiteKeyHash}`,
    adminEmail: `playwright.wae+${suiteKeyHash}@example.com`,
  };
}

export function buildWaePinManifest(templateVersionTag: string): WaePinManifest {
  return {
    lifecycleContractVersion: WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION,
    scenarioMatrixContractVersion: WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION,
    agentTemplateLifecycleContractVersion: WAE_AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION,
    seedScript: WAE_EVAL_PINNED_INPUTS.seedScript,
    scenarioMatrix: WAE_EVAL_PINNED_INPUTS.scenarioMatrix,
    agentOntology: WAE_EVAL_PINNED_INPUTS.agentOntology,
    templateVersionTag,
  };
}

export function validateWaePinManifest(pinManifest: WaePinManifest): string[] {
  const reasonCodes: string[] = [];

  if (pinManifest.lifecycleContractVersion !== WAE_EVAL_ORG_LIFECYCLE_CONTRACT_VERSION) {
    reasonCodes.push("seed_contract_drift");
  }
  if (
    pinManifest.scenarioMatrixContractVersion !== WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION
  ) {
    reasonCodes.push("seed_contract_drift");
  }
  if (
    pinManifest.agentTemplateLifecycleContractVersion
    !== WAE_AGENT_TEMPLATE_LIFECYCLE_CONTRACT_VERSION
  ) {
    reasonCodes.push("seed_contract_drift");
  }

  if (!normalizeNonEmptyString(pinManifest.seedScript.seedAll.path)) {
    reasonCodes.push("missing_pin_manifest");
  }
  if (
    pinManifest.seedScript.seedAll.sha256 !== WAE_EVAL_PINNED_INPUTS.seedScript.seedAll.sha256
    || pinManifest.seedScript.reseed.sha256 !== WAE_EVAL_PINNED_INPUTS.seedScript.reseed.sha256
    || pinManifest.scenarioMatrix.sha256 !== WAE_EVAL_PINNED_INPUTS.scenarioMatrix.sha256
    || pinManifest.agentOntology.sha256 !== WAE_EVAL_PINNED_INPUTS.agentOntology.sha256
  ) {
    reasonCodes.push("seed_contract_drift");
  }
  if (!normalizeNonEmptyString(pinManifest.templateVersionTag)) {
    reasonCodes.push("seed_contract_drift");
  }

  return collectLexicalReasonCodes(reasonCodes);
}

export function buildWaeLifecyclePaths(
  runId: string,
  reportsRoot = path.join(process.cwd(), "tmp", "reports", "wae"),
): WaeLifecyclePaths {
  const rootDir = path.join(reportsRoot, runId, "lifecycle");
  return {
    rootDir,
    pinManifestPath: path.join(rootDir, "pin-manifest.json"),
    createReceiptPath: path.join(rootDir, "create-receipt.json"),
    resetReceiptPath: path.join(rootDir, "reset-receipt.json"),
    teardownReceiptPath: path.join(rootDir, "teardown-receipt.json"),
    evidenceIndexPath: path.join(rootDir, "evidence-index.json"),
  };
}

async function writeJson(filePath: string, value: unknown): Promise<string> {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(filePath, body, "utf8");
  return sha256(body);
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function sha256File(filePath: string): Promise<string | null> {
  try {
    const body = await fs.readFile(filePath, "utf8");
    return sha256(body);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeWaeLifecycleEvidenceIndex(args: {
  runId: string;
  reportsRoot?: string;
  playwrightArtifacts?: string[];
  bundleArtifacts?: string[];
  generatedAt?: number;
}): Promise<WaeLifecycleEvidenceIndex> {
  const paths = buildWaeLifecyclePaths(args.runId, args.reportsRoot);
  await fs.mkdir(paths.rootDir, { recursive: true });

  const evidenceIndex: WaeLifecycleEvidenceIndex = {
    runId: args.runId,
    contractVersion: WAE_LIFECYCLE_EVIDENCE_CONTRACT_VERSION,
    checksums: {
      "pin-manifest.json": await sha256File(paths.pinManifestPath),
      "create-receipt.json": await sha256File(paths.createReceiptPath),
      "reset-receipt.json": await sha256File(paths.resetReceiptPath),
      "teardown-receipt.json": await sha256File(paths.teardownReceiptPath),
      "evidence-index.json": null,
    },
    artifacts: {
      playwright: [...new Set(args.playwrightArtifacts ?? [])].sort(),
      bundle: [...new Set(args.bundleArtifacts ?? [])].sort(),
    },
    generatedAt: args.generatedAt ?? Date.now(),
  };

  await writeJson(paths.evidenceIndexPath, evidenceIndex);
  return evidenceIndex;
}

export async function writeWaeLifecycleArtifacts(
  input: WaeLifecycleArtifactsInput,
): Promise<WaeLifecyclePaths> {
  const paths = buildWaeLifecyclePaths(input.runId, input.reportsRoot);
  await fs.mkdir(paths.rootDir, { recursive: true });

  await writeJson(paths.pinManifestPath, input.pinManifest);
  await writeJson(paths.createReceiptPath, {
    ...input.createReceipt,
    reasonCodes: collectLexicalReasonCodes(input.createReceipt.reasonCodes),
  });
  await writeJson(paths.resetReceiptPath, {
    ...input.resetReceipt,
    reasonCodes: collectLexicalReasonCodes(input.resetReceipt.reasonCodes),
  });
  await writeJson(paths.teardownReceiptPath, {
    ...input.teardownReceipt,
    reasonCodes: collectLexicalReasonCodes(input.teardownReceipt.reasonCodes),
  });

  await writeWaeLifecycleEvidenceIndex({
    runId: input.runId,
    reportsRoot: input.reportsRoot,
    playwrightArtifacts: input.playwrightArtifacts,
    bundleArtifacts: input.bundleArtifacts,
    generatedAt: Date.now(),
  });

  return paths;
}

export async function refreshWaeLifecycleEvidenceIndex(args: {
  runId: string;
  reportsRoot?: string;
  playwrightArtifacts?: string[];
  bundleArtifacts?: string[];
  generatedAt?: number;
}): Promise<WaeLifecycleEvidenceIndex> {
  return writeWaeLifecycleEvidenceIndex(args);
}

export async function ensureWaeLifecycleArtifacts(args: {
  runId: string;
  suiteKeyHash: string;
  organizationId: string;
  organizationSlug: string;
  templateVersionTag: string;
  reportsRoot?: string;
  status?: WaeLifecycleStatus;
  reasonCodes?: string[];
  attempt?: number;
}): Promise<WaeLifecyclePaths> {
  const paths = buildWaeLifecyclePaths(args.runId, args.reportsRoot);
  const existing = await Promise.all([
    readJsonFile<WaePinManifest>(paths.pinManifestPath),
    readJsonFile<WaeLifecycleReceipt>(paths.createReceiptPath),
    readJsonFile<WaeLifecycleReceipt>(paths.resetReceiptPath),
    readJsonFile<WaeLifecycleReceipt>(paths.teardownReceiptPath),
  ]);

  if (existing.every(Boolean)) {
    await writeWaeLifecycleEvidenceIndex({
      runId: args.runId,
      reportsRoot: args.reportsRoot,
    });
    return paths;
  }

  const reasonCodes = collectLexicalReasonCodes(args.reasonCodes ?? []);
  const status = args.status ?? "passed";
  const attempt = args.attempt ?? 1;

  return writeWaeLifecycleArtifacts({
    runId: args.runId,
    reportsRoot: args.reportsRoot,
    pinManifest: buildWaePinManifest(args.templateVersionTag),
    createReceipt: {
      runId: args.runId,
      suiteKeyHash: args.suiteKeyHash,
      organizationId: args.organizationId,
      organizationSlug: args.organizationSlug,
      templateVersionTag: args.templateVersionTag,
      scenarioMatrixContractVersion: WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION,
      status,
      reasonCodes,
      attempt,
      timestamp: Date.now(),
    },
    resetReceipt: {
      runId: args.runId,
      suiteKeyHash: args.suiteKeyHash,
      organizationId: args.organizationId,
      organizationSlug: args.organizationSlug,
      templateVersionTag: args.templateVersionTag,
      scenarioMatrixContractVersion: WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION,
      status,
      reasonCodes,
      attempt,
      timestamp: Date.now(),
      preCount: 0,
      postCount: 0,
    },
    teardownReceipt: {
      runId: args.runId,
      suiteKeyHash: args.suiteKeyHash,
      organizationId: args.organizationId,
      organizationSlug: args.organizationSlug,
      templateVersionTag: args.templateVersionTag,
      scenarioMatrixContractVersion: WAE_EVAL_SCENARIO_MATRIX_CONTRACT_VERSION,
      status,
      reasonCodes,
      attempt,
      timestamp: Date.now(),
      mode: "replay_preserve",
    },
  });
}

export function buildWaeStorageState(args: {
  origin: string;
  sessionId: string;
}): {
  cookies: unknown[];
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
} {
  return {
    cookies: [],
    origins: [
      {
        origin: args.origin,
        localStorage: [{ name: "convex_session_id", value: args.sessionId }],
      },
    ],
  };
}
