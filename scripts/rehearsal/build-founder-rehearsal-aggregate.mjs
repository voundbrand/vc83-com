import fs from "node:fs/promises";
import path from "node:path";

const SCENARIO_IDS = [
  "FND-001",
  "FND-002",
  "FND-003",
  "FND-004",
  "FND-005",
  "FND-006",
  "FND-007",
];

const SCORECARD_PATH =
  "docs/reference_docs/topic_collections/implementation/life-operator-one-of-one-cutover/DEMO_READINESS_SCORECARD.md";
const OUTPUT_PATH = path.join(
  process.cwd(),
  "tmp",
  "reports",
  "founder-rehearsal",
  "latest.json",
);

function scenarioArtifactPath(scenarioId) {
  return path.join(process.cwd(), "tmp", "reports", scenarioId.toLowerCase(), "latest.json");
}

function assertScenarioArtifactShape(report, scenarioId) {
  if (!report || typeof report !== "object") {
    throw new Error(`Invalid report payload for ${scenarioId}.`);
  }
  if (report.scenarioId !== scenarioId) {
    throw new Error(
      `Scenario mismatch in ${scenarioId}: expected scenarioId=${scenarioId}, got ${String(report.scenarioId)}.`,
    );
  }
  if (!Array.isArray(report.checkpointResults) || report.checkpointResults.length !== 4) {
    throw new Error(`Scenario ${scenarioId} must include exactly 4 checkpoint results.`);
  }
}

function toPassFail(value) {
  return value ? "PASS" : "FAIL";
}

function evaluateDimensions(report) {
  const utility = report.checkpointPassCount === 4 && report.checkpointFailIds === "none";
  const trust =
    report.trustEventCoverage === "covered" &&
    Number(report.approvedMutationCount) >= Number(report.mutatingActionCount);
  const speed =
    Number(report.firstActionableSeconds) <= 45 && Number(report.totalRuntimeSeconds) <= 420;
  const clarity =
    (report.preflightStatus === "available_now" || report.preflightStatus === "blocked") &&
    (report.preflightStatus !== "blocked" || report.blockedUnblockingStepsPresent === "yes");
  const consistency = report.oneVisibleOperatorMaintained === "yes";
  return {
    utility,
    trust,
    speed,
    clarity,
    consistency,
  };
}

async function loadScenarioReport(scenarioId) {
  const sourcePath = scenarioArtifactPath(scenarioId);
  let raw;
  try {
    raw = await fs.readFile(sourcePath, "utf8");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown read error";
    throw new Error(`Missing required scenario artifact for ${scenarioId}: ${sourcePath} (${message})`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown parse error";
    throw new Error(`Invalid JSON in scenario artifact ${sourcePath} (${message})`);
  }

  assertScenarioArtifactShape(parsed, scenarioId);
  return {
    report: parsed,
    sourcePath,
  };
}

function summarizeDimensions(scenarioRows) {
  const dimensionKeys = ["utility", "trust", "speed", "clarity", "consistency"];
  return dimensionKeys.reduce((accumulator, key) => {
    const passCount = scenarioRows.filter((row) => row.dimensions[key] === "PASS").length;
    accumulator[key] = {
      passCount,
      total: scenarioRows.length,
      status: passCount === scenarioRows.length ? "PASS" : "FAIL",
    };
    return accumulator;
  }, {});
}

async function main() {
  const loadedReports = await Promise.all(SCENARIO_IDS.map((scenarioId) => loadScenarioReport(scenarioId)));
  const scenarioRows = loadedReports.map(({ report, sourcePath }) => {
    const dimensionsRaw = evaluateDimensions(report);
    const dimensions = {
      utility: toPassFail(dimensionsRaw.utility),
      trust: toPassFail(dimensionsRaw.trust),
      speed: toPassFail(dimensionsRaw.speed),
      clarity: toPassFail(dimensionsRaw.clarity),
      consistency: toPassFail(dimensionsRaw.consistency),
    };
    const scorecardRowPass =
      dimensionsRaw.utility &&
      dimensionsRaw.trust &&
      dimensionsRaw.speed &&
      dimensionsRaw.clarity &&
      dimensionsRaw.consistency &&
      report.result === "PASS";

    return {
      scenarioId: report.scenarioId,
      runId: report.runId,
      result: report.result,
      scorecardRow: scorecardRowPass ? "PASS" : "FAIL",
      rehearsalMode: report.rehearsalMode,
      preflightStatus: report.preflightStatus,
      checkpointPassCount: report.checkpointPassCount,
      checkpointFailIds: report.checkpointFailIds,
      firstActionableSeconds: report.firstActionableSeconds,
      totalRuntimeSeconds: report.totalRuntimeSeconds,
      mutatingActionCount: report.mutatingActionCount,
      approvedMutationCount: report.approvedMutationCount,
      trustEventCoverage: report.trustEventCoverage,
      blockedUnblockingStepsPresent: report.blockedUnblockingStepsPresent,
      oneVisibleOperatorMaintained: report.oneVisibleOperatorMaintained,
      dimensions,
      sourcePath,
    };
  });

  const missingScenarioIds = SCENARIO_IDS.filter(
    (scenarioId) => !scenarioRows.some((row) => row.scenarioId === scenarioId),
  );
  if (missingScenarioIds.length > 0) {
    throw new Error(`Missing scenario artifacts: ${missingScenarioIds.join(", ")}`);
  }

  const dimensionsSummary = summarizeDimensions(scenarioRows);
  const passCount = scenarioRows.filter((row) => row.scorecardRow === "PASS").length;
  const failCount = scenarioRows.length - passCount;
  const liveCount = scenarioRows.filter((row) => row.rehearsalMode === "live").length;
  const simulatedCount = scenarioRows.length - liveCount;
  const trustFailures = scenarioRows
    .filter((row) => row.dimensions.trust === "FAIL")
    .map((row) => row.scenarioId);
  const clarityFailures = scenarioRows
    .filter((row) => row.dimensions.clarity === "FAIL")
    .map((row) => row.scenarioId);
  const result = passCount === scenarioRows.length ? "GO" : "NO_GO";

  const notes = [];
  if (trustFailures.length > 0) {
    notes.push(`Trust dimension failure: ${trustFailures.join(", ")}.`);
  }
  if (clarityFailures.length > 0) {
    notes.push(`Clarity dimension failure: ${clarityFailures.join(", ")}.`);
  }
  if (result === "NO_GO" && notes.length === 0) {
    const failingScenarios = scenarioRows
      .filter((row) => row.scorecardRow === "FAIL")
      .map((row) => row.scenarioId);
    notes.push(`Rehearsal set is NO_GO due to scenario failures: ${failingScenarios.join(", ")}.`);
  }

  const aggregate = {
    generatedAt: new Date().toISOString(),
    scorecardSource: SCORECARD_PATH,
    requiredScenarios: SCENARIO_IDS,
    missingScenarioIds,
    dimensionsSummary,
    totals: {
      scenarioCount: scenarioRows.length,
      passCount,
      failCount,
      liveCount,
      simulatedCount,
    },
    immediateNoGoSignals: {
      trustFailures,
      clarityFailures,
    },
    result,
    notes: notes.length > 0 ? notes.join(" | ") : "All scorecard rows passed.",
    scenarioReports: scenarioRows,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(aggregate, null, 2), "utf8");
  console.log(`Founder rehearsal aggregate written: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
