#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_AGE_DAYS = 7;
const DEFAULT_ARTIFACT_DIR = path.join(
  process.cwd(),
  "docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime/artifacts/orv-056",
);

const METRIC_BUDGET_PATHS = {
  interrupt_to_silence: "interrupt_to_silence_p95_max_ms",
  time_to_first_assistant_audio: "time_to_first_assistant_audio_p95_max_ms",
  live_transcript_lag: "live_transcript_lag_p95_max_ms",
};

function parseArgs(argv) {
  const args = {
    artifactDir: DEFAULT_ARTIFACT_DIR,
    maxAgeDays: DEFAULT_MAX_AGE_DAYS,
    requireRealNetwork: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--artifact-dir") {
      args.artifactDir = path.resolve(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (token === "--max-age-days") {
      const parsed = Number(argv[index + 1]);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --max-age-days value: ${argv[index + 1] || "missing"}`);
      }
      args.maxAgeDays = parsed;
      index += 1;
      continue;
    }
    if (token === "--require-real-network") {
      args.requireRealNetwork = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      console.log("Usage:");
      console.log("  node scripts/mobile/voice-latency-evidence-refresh-check.mjs [options]");
      console.log("");
      console.log("Options:");
      console.log("  --artifact-dir <path>       Artifact folder (default: ORV-056 artifact dir)");
      console.log("  --max-age-days <n>          Max allowed age in days (default: 7)");
      console.log("  --require-real-network      Fail when latest artifact is synthetic/sandbox");
      process.exit(0);
    }
  }

  return args;
}

function listArtifactCandidates(artifactDir) {
  if (!fs.existsSync(artifactDir)) {
    return [];
  }
  const entries = fs.readdirSync(artifactDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name.startsWith("mobile_voice_latency_metrics_")
        && name.toLowerCase().endsWith(".json"),
    )
    .map((name) => path.join(artifactDir, name));
}

function parseArtifactFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const measuredAtMs = Date.parse(parsed?.measuredAtUtc || "");
    return {
      filePath,
      measuredAtMs: Number.isFinite(measuredAtMs) ? measuredAtMs : 0,
      artifact: parsed,
    };
  } catch {
    return null;
  }
}

function selectLatestArtifact(artifactDir) {
  const parsed = listArtifactCandidates(artifactDir)
    .map(parseArtifactFile)
    .filter(Boolean);
  if (parsed.length === 0) {
    return null;
  }
  parsed.sort((left, right) => {
    if (left.measuredAtMs !== right.measuredAtMs) {
      return right.measuredAtMs - left.measuredAtMs;
    }
    return right.filePath.localeCompare(left.filePath);
  });
  return parsed[0];
}

function isSyntheticEnvironment(environmentLabel) {
  const normalized =
    typeof environmentLabel === "string" ? environmentLabel.toLowerCase() : "";
  return normalized.includes("synthetic") || normalized.includes("sandbox");
}

function evaluateArtifact(args) {
  const nowMs = Date.now();
  const measuredAtMs = Number.isFinite(args.latest.measuredAtMs)
    ? args.latest.measuredAtMs
    : 0;
  const ageMs = Math.max(0, nowMs - measuredAtMs);
  const ageDays = ageMs / DAY_MS;

  const environmentLabel =
    typeof args.latest.artifact?.environment === "string"
      ? args.latest.artifact.environment
      : "unknown";
  const synthetic = isSyntheticEnvironment(environmentLabel);

  const budgetFailures = [];
  for (const metricKey of Object.keys(METRIC_BUDGET_PATHS)) {
    const aggregate = args.latest.artifact?.aggregate?.[metricKey];
    const p95Ms = Number(aggregate?.p95Ms);
    const budgetKey = METRIC_BUDGET_PATHS[metricKey];
    const budgetMs = Number(args.latest.artifact?.budgets?.[budgetKey]);
    if (!Number.isFinite(p95Ms) || !Number.isFinite(budgetMs) || p95Ms > budgetMs) {
      budgetFailures.push({
        metricKey,
        p95Ms: Number.isFinite(p95Ms) ? p95Ms : null,
        budgetMs: Number.isFinite(budgetMs) ? budgetMs : null,
      });
    }
  }

  const failures = [];
  if (!Number.isFinite(measuredAtMs) || measuredAtMs <= 0) {
    failures.push("missing_or_invalid_measuredAtUtc");
  }
  if (ageDays > args.maxAgeDays) {
    failures.push(`evidence_stale_over_${args.maxAgeDays}_days`);
  }
  if (args.requireRealNetwork && synthetic) {
    failures.push("latest_evidence_is_synthetic");
  }
  if (budgetFailures.length > 0) {
    failures.push("latency_budget_breach_or_missing_metric");
  }

  return {
    ageDays,
    environmentLabel,
    synthetic,
    budgetFailures,
    failures,
  };
}

function formatMetricLine(latestArtifact, metricKey) {
  const aggregate = latestArtifact?.aggregate?.[metricKey];
  const p95Ms = Number(aggregate?.p95Ms);
  const budgetKey = METRIC_BUDGET_PATHS[metricKey];
  const budgetMs = Number(latestArtifact?.budgets?.[budgetKey]);
  const p95Label = Number.isFinite(p95Ms) ? `${Math.floor(p95Ms)}ms` : "missing";
  const budgetLabel = Number.isFinite(budgetMs) ? `${Math.floor(budgetMs)}ms` : "missing";
  const status =
    Number.isFinite(p95Ms) && Number.isFinite(budgetMs) && p95Ms <= budgetMs
      ? "PASS"
      : "FAIL";
  return `- ${metricKey}: p95=${p95Label}, budget=${budgetLabel}, status=${status}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const latest = selectLatestArtifact(args.artifactDir);
  if (!latest) {
    console.error(
      `[VoiceLatencyEvidence] FAIL: no latency evidence artifacts found in ${args.artifactDir}`,
    );
    process.exit(1);
  }

  const evaluation = evaluateArtifact({
    latest,
    maxAgeDays: args.maxAgeDays,
    requireRealNetwork: args.requireRealNetwork,
  });

  console.log(`[VoiceLatencyEvidence] artifact=${path.relative(process.cwd(), latest.filePath)}`);
  console.log(
    `[VoiceLatencyEvidence] measuredAtUtc=${latest.artifact?.measuredAtUtc || "missing"} ageDays=${evaluation.ageDays.toFixed(2)} maxAgeDays=${args.maxAgeDays}`,
  );
  console.log(
    `[VoiceLatencyEvidence] environment=${evaluation.environmentLabel} synthetic=${evaluation.synthetic ? "yes" : "no"} requireRealNetwork=${args.requireRealNetwork ? "yes" : "no"}`,
  );
  console.log(formatMetricLine(latest.artifact, "interrupt_to_silence"));
  console.log(formatMetricLine(latest.artifact, "time_to_first_assistant_audio"));
  console.log(formatMetricLine(latest.artifact, "live_transcript_lag"));

  if (evaluation.failures.length > 0) {
    console.error("[VoiceLatencyEvidence] FAIL reasons:");
    for (const reason of evaluation.failures) {
      console.error(`- ${reason}`);
    }
    if (evaluation.budgetFailures.length > 0) {
      for (const failure of evaluation.budgetFailures) {
        console.error(
          `- metric=${failure.metricKey} p95=${failure.p95Ms ?? "missing"} budget=${failure.budgetMs ?? "missing"}`,
        );
      }
    }
    process.exit(1);
  }

  console.log("[VoiceLatencyEvidence] PASS");
}

main();
