#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const TERMINAL_STATES = new Set([
  "completed",
  "hangup-user",
  "hangup-bot",
  "timeout",
  "error",
  "failed",
  "no-answer",
  "busy",
  "voicemail",
]);

function die(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function usage() {
  console.log(`Usage:
  voicecall-baseline-tool.mjs summarize --input <calls.jsonl> [--last <n>] [--label <name>] --output <metrics.json> [--markdown <summary.md>]
  voicecall-baseline-tool.mjs compare --pilot <pilot-metrics.json> --current <current-metrics.json> --output <comparison.json> [--markdown <comparison.md>]
`);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      flags[key] = "true";
      continue;
    }
    flags[key] = value;
    i += 1;
  }
  return flags;
}

function toFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function percentile(values, p) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? null;
}

function summarizeSeries(values) {
  if (values.length === 0) {
    return {
      count: 0,
      minMs: null,
      maxMs: null,
      avgMs: null,
      p50Ms: null,
      p95Ms: null,
      p99Ms: null,
    };
  }
  const minMs = values.reduce((min, v) => (v < min ? v : min), Number.POSITIVE_INFINITY);
  const maxMs = values.reduce((max, v) => (v > max ? v : max), Number.NEGATIVE_INFINITY);
  const avgMs = values.reduce((sum, v) => sum + v, 0) / values.length;
  return {
    count: values.length,
    minMs,
    maxMs,
    avgMs,
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    p99Ms: percentile(values, 99),
  };
}

function formatNumber(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(digits);
}

function formatIso(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return new Date(value).toISOString();
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runSummarize(flags) {
  const input = flags.input;
  const output = flags.output;
  const label = flags.label ?? "unlabeled";
  const markdown = flags.markdown;
  const requestedLast = Number(flags.last ?? "200");

  if (!input) {
    die("--input is required for summarize");
  }
  if (!output) {
    die("--output is required for summarize");
  }
  if (!fs.existsSync(input)) {
    die(`Input file not found: ${input}`);
  }
  if (!Number.isFinite(requestedLast) || requestedLast <= 0) {
    die("--last must be a positive number");
  }

  const raw = fs.readFileSync(input, "utf8");
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const scannedLines = lines.slice(-Math.floor(requestedLast));

  const callsById = new Map();
  const turnLatency = [];
  const listenWait = [];
  let parseErrors = 0;

  for (const line of scannedLines) {
    try {
      const record = JSON.parse(line);
      if (record && typeof record.callId === "string") {
        callsById.set(record.callId, record);
      }
      const metadata = record && typeof record === "object" ? record.metadata ?? {} : {};
      const latencyMs = toFiniteNumber(metadata.lastTurnLatencyMs);
      const listenWaitMs = toFiniteNumber(metadata.lastTurnListenWaitMs);
      if (latencyMs !== null) {
        turnLatency.push(latencyMs);
      }
      if (listenWaitMs !== null) {
        listenWait.push(listenWaitMs);
      }
    } catch {
      parseErrors += 1;
    }
  }

  const deduped = Array.from(callsById.values());
  const startedAtValues = [];
  const endedAtValues = [];
  let completedCalls = 0;
  let totalTurnsObserved = 0;

  for (const call of deduped) {
    const startedAt = toFiniteNumber(call?.startedAt);
    if (startedAt !== null) {
      startedAtValues.push(startedAt);
    }
    const metadata = call && typeof call === "object" ? call.metadata ?? {} : {};
    const endedAt =
      toFiniteNumber(call?.endedAt) ??
      toFiniteNumber(metadata.lastTurnCompletedAt) ??
      toFiniteNumber(call?.startedAt);
    if (endedAt !== null) {
      endedAtValues.push(endedAt);
    }
    if (typeof call?.state === "string" && TERMINAL_STATES.has(call.state)) {
      completedCalls += 1;
    }
    const turnCount = toFiniteNumber(metadata.turnCount);
    if (turnCount !== null) {
      totalTurnsObserved += turnCount;
    }
  }

  const windowStartMs =
    startedAtValues.length > 0 ? Math.min(...startedAtValues) : toFiniteNumber(Date.now());
  const windowEndMs =
    endedAtValues.length > 0 ? Math.max(...endedAtValues) : toFiniteNumber(windowStartMs);
  const durationMs =
    windowStartMs !== null && windowEndMs !== null && windowEndMs > windowStartMs
      ? windowEndMs - windowStartMs
      : 0;
  const durationMinutes = durationMs > 0 ? durationMs / 60000 : 0;

  const uniqueCalls = deduped.length;
  const activeCalls = Math.max(0, uniqueCalls - completedCalls);

  const summary = {
    generatedAtUtc: new Date().toISOString(),
    label,
    inputFile: input,
    requestedLast: Math.floor(requestedLast),
    recordsScanned: scannedLines.length,
    parseErrors,
    uniqueCalls,
    completedCalls,
    activeCalls,
    analysisWindow: {
      startMs: windowStartMs,
      startIso: formatIso(windowStartMs),
      endMs: windowEndMs,
      endIso: formatIso(windowEndMs),
      durationMs,
      durationMinutes,
    },
    latency: {
      turn: summarizeSeries(turnLatency),
      listenWait: summarizeSeries(listenWait),
    },
    throughput: {
      totalTurnsObserved,
      callsPerMinute: durationMinutes > 0 ? uniqueCalls / durationMinutes : null,
      completedCallsPerMinute: durationMinutes > 0 ? completedCalls / durationMinutes : null,
      turnsPerMinute: durationMinutes > 0 ? totalTurnsObserved / durationMinutes : null,
    },
  };

  ensureDirForFile(output);
  fs.writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`);

  if (markdown) {
    const report = `# Voice Baseline Summary: ${label}

Generated: ${summary.generatedAtUtc}
Input: \`${input}\`

## Coverage

| Metric | Value |
|---|---|
| Records scanned | ${summary.recordsScanned} |
| Parse errors | ${summary.parseErrors} |
| Unique calls | ${summary.uniqueCalls} |
| Completed calls | ${summary.completedCalls} |
| Active calls | ${summary.activeCalls} |
| Window duration (min) | ${formatNumber(summary.analysisWindow.durationMinutes, 2)} |

## Throughput

| Metric | Value |
|---|---|
| Calls/min | ${formatNumber(summary.throughput.callsPerMinute, 3)} |
| Completed calls/min | ${formatNumber(summary.throughput.completedCallsPerMinute, 3)} |
| Turns/min | ${formatNumber(summary.throughput.turnsPerMinute, 3)} |
| Total turns observed | ${summary.throughput.totalTurnsObserved} |

## Turn Latency (ms)

| Metric | Value |
|---|---|
| Count | ${summary.latency.turn.count} |
| Min | ${formatNumber(summary.latency.turn.minMs, 2)} |
| Avg | ${formatNumber(summary.latency.turn.avgMs, 2)} |
| P50 | ${formatNumber(summary.latency.turn.p50Ms, 2)} |
| P95 | ${formatNumber(summary.latency.turn.p95Ms, 2)} |
| P99 | ${formatNumber(summary.latency.turn.p99Ms, 2)} |
| Max | ${formatNumber(summary.latency.turn.maxMs, 2)} |

## Listen Wait (ms)

| Metric | Value |
|---|---|
| Count | ${summary.latency.listenWait.count} |
| Min | ${formatNumber(summary.latency.listenWait.minMs, 2)} |
| Avg | ${formatNumber(summary.latency.listenWait.avgMs, 2)} |
| P50 | ${formatNumber(summary.latency.listenWait.p50Ms, 2)} |
| P95 | ${formatNumber(summary.latency.listenWait.p95Ms, 2)} |
| P99 | ${formatNumber(summary.latency.listenWait.p99Ms, 2)} |
| Max | ${formatNumber(summary.latency.listenWait.maxMs, 2)} |
`;
    ensureDirForFile(markdown);
    fs.writeFileSync(markdown, report);
  }

  console.log(`Wrote metrics: ${output}`);
  if (markdown) {
    console.log(`Wrote summary: ${markdown}`);
  }
}

function loadJson(filePath) {
  if (!filePath) {
    die("Missing file path");
  }
  if (!fs.existsSync(filePath)) {
    die(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function diffNullable(a, b) {
  const aNum = toFiniteNumber(a);
  const bNum = toFiniteNumber(b);
  if (aNum === null || bNum === null) {
    return null;
  }
  return aNum - bNum;
}

function runCompare(flags) {
  const pilotPath = flags.pilot;
  const currentPath = flags.current;
  const output = flags.output;
  const markdown = flags.markdown;
  if (!pilotPath || !currentPath || !output) {
    die("compare requires --pilot, --current, and --output");
  }

  const pilot = loadJson(pilotPath);
  const current = loadJson(currentPath);

  const latencyPilot = pilot?.latency?.turn ?? {};
  const latencyCurrent = current?.latency?.turn ?? {};
  const throughputPilot = pilot?.throughput ?? {};
  const throughputCurrent = current?.throughput ?? {};

  const comparison = {
    generatedAtUtc: new Date().toISOString(),
    pilotMetricsFile: pilotPath,
    currentMetricsFile: currentPath,
    deltas: {
      turnLatencyMs: {
        p50: diffNullable(latencyPilot.p50Ms, latencyCurrent.p50Ms),
        p95: diffNullable(latencyPilot.p95Ms, latencyCurrent.p95Ms),
        p99: diffNullable(latencyPilot.p99Ms, latencyCurrent.p99Ms),
      },
      throughput: {
        callsPerMinute: diffNullable(throughputPilot.callsPerMinute, throughputCurrent.callsPerMinute),
        turnsPerMinute: diffNullable(throughputPilot.turnsPerMinute, throughputCurrent.turnsPerMinute),
      },
    },
    recommendation: "",
  };

  const p95Pilot = toFiniteNumber(latencyPilot.p95Ms);
  const p95Current = toFiniteNumber(latencyCurrent.p95Ms);
  const callsPilot = toFiniteNumber(throughputPilot.callsPerMinute);
  const callsCurrent = toFiniteNumber(throughputCurrent.callsPerMinute);
  const turnsPilot = toFiniteNumber(throughputPilot.turnsPerMinute);
  const turnsCurrent = toFiniteNumber(throughputCurrent.turnsPerMinute);

  if (
    p95Pilot !== null &&
    p95Current !== null &&
    callsPilot !== null &&
    callsCurrent !== null &&
    turnsPilot !== null &&
    turnsCurrent !== null
  ) {
    if (p95Pilot <= p95Current && callsPilot >= callsCurrent && turnsPilot >= turnsCurrent) {
      comparison.recommendation =
        "Pilot path outperforms or matches current path on p95 latency and throughput; migration is recommended.";
    } else if (p95Pilot > p95Current && callsPilot < callsCurrent && turnsPilot < turnsCurrent) {
      comparison.recommendation =
        "Pilot path underperforms current path on both latency and throughput; keep current path while tuning pilot.";
    } else {
      comparison.recommendation =
        "Results are mixed; do not make a final migration decision yet. Collect larger matched samples before deciding.";
    }
  } else {
    comparison.recommendation =
      "Insufficient comparable metrics for an evidence-backed migration decision. Re-run baseline capture with larger matched datasets.";
  }

  ensureDirForFile(output);
  fs.writeFileSync(output, `${JSON.stringify(comparison, null, 2)}\n`);

  if (markdown) {
    const report = `# Voice Baseline Comparison

Generated: ${comparison.generatedAtUtc}

Pilot metrics: \`${pilotPath}\`  
Current-path metrics: \`${currentPath}\`

## Delta (pilot - current)

| Metric | Delta |
|---|---|
| Turn latency p50 (ms) | ${formatNumber(comparison.deltas.turnLatencyMs.p50, 2)} |
| Turn latency p95 (ms) | ${formatNumber(comparison.deltas.turnLatencyMs.p95, 2)} |
| Turn latency p99 (ms) | ${formatNumber(comparison.deltas.turnLatencyMs.p99, 2)} |
| Calls/min | ${formatNumber(comparison.deltas.throughput.callsPerMinute, 3)} |
| Turns/min | ${formatNumber(comparison.deltas.throughput.turnsPerMinute, 3)} |

## Recommendation

${comparison.recommendation}
`;
    ensureDirForFile(markdown);
    fs.writeFileSync(markdown, report);
  }

  console.log(`Wrote comparison: ${output}`);
  if (markdown) {
    console.log(`Wrote comparison markdown: ${markdown}`);
  }
}

function main() {
  const command = process.argv[2];
  if (!command || command === "--help" || command === "-h") {
    usage();
    process.exit(command ? 0 : 1);
  }
  const flags = parseFlags(process.argv.slice(3));
  if (command === "summarize") {
    runSummarize(flags);
    return;
  }
  if (command === "compare") {
    runCompare(flags);
    return;
  }
  usage();
  die(`Unknown command: ${command}`);
}

main();
