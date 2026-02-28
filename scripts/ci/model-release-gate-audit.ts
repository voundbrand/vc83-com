import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "../../convex/_generated/api";
import {
  buildModelReleaseGateAuditReport,
  formatModelReleaseGateAuditSummary,
  normalizeBooleanReleaseGateFlag,
  normalizeModelReleaseGateAuditMode,
  shouldFailModelReleaseGateAudit,
  type ModelReleaseGateSnapshot,
} from "../../convex/ai/modelReleaseGateAudit";

loadEnv({ path: ".env.local" });
loadEnv();

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ensureDirectoryForFile(filePath: string): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for model release gate audit.`);
  }
  return value;
}

async function fetchModelSnapshots(): Promise<ModelReleaseGateSnapshot[]> {
  const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL");
  const deployKey = requireEnv("CONVEX_DEPLOY_KEY");
  const client = new ConvexHttpClient(convexUrl);
  const maybeAdminClient = client as any;
  if (typeof maybeAdminClient.setAdminAuth !== "function") {
    throw new Error("Convex admin auth is unavailable in this runtime.");
  }
  maybeAdminClient.setAdminAuth(deployKey);

  return await client.query(
    (internal as any).ai.platformModelManagement.getModelReleaseGateSnapshots,
    {}
  );
}

async function run() {
  const mode = normalizeModelReleaseGateAuditMode(
    process.env.MODEL_RELEASE_GATE_MODE
  );
  const requireOperationalReviewForEnabledModels =
    normalizeBooleanReleaseGateFlag(
      process.env.MODEL_RELEASE_GATE_REQUIRE_OPERATIONAL_REVIEW_FOR_ENABLED_MODELS,
      true
    );
  const expectedCriticalToolContractCount = parseOptionalInteger(
    process.env.MODEL_RELEASE_GATE_EXPECTED_CRITICAL_TOOL_CONTRACT_COUNT
  );
  const reportPath =
    process.env.MODEL_RELEASE_GATE_REPORT_PATH?.trim() ||
    "tmp/reports/model-release-gate/latest.json";
  const summaryPath =
    process.env.MODEL_RELEASE_GATE_SUMMARY_PATH?.trim() ||
    "tmp/reports/model-release-gate/latest.txt";

  const snapshots = await fetchModelSnapshots();
  const report = buildModelReleaseGateAuditReport({
    models: snapshots,
    policy: {
      requireOperationalReviewForEnabledModels,
      ...(typeof expectedCriticalToolContractCount === "number"
        ? { expectedCriticalToolContractCount }
        : {}),
    },
  });
  const summary = formatModelReleaseGateAuditSummary({ mode, report });
  const shouldFail = shouldFailModelReleaseGateAudit({ mode, report });

  const payload = {
    mode,
    generatedAtIso: new Date(report.generatedAt).toISOString(),
    report,
  };

  ensureDirectoryForFile(reportPath);
  ensureDirectoryForFile(summaryPath);
  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.writeFileSync(summaryPath, `${summary}\n`, "utf8");

  console.log(summary);
  console.log(`JSON report: ${reportPath}`);
  console.log(`Summary report: ${summaryPath}`);

  if (shouldFail) {
    console.error(
      "Model release gate enforce mode failed. Blocking models are listed above."
    );
    process.exit(1);
  }

  if (report.blockingModelCount > 0) {
    console.warn(
      "Model release gate audit mode detected blocking models (non-fatal in audit mode)."
    );
  } else {
    console.log("Model release gate audit passed with no blocking models.");
  }
}

run().catch((error) => {
  console.error(
    `Model release gate audit failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
});
