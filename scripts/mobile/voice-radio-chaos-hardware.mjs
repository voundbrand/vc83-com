#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WORKSTREAM_ROOT =
  "docs/reference_docs/topic_collections/implementation/operator-mobile-realtime-voice-runtime";

function parseArgs(argv) {
  const result = {
    platform: "android",
    deviceId: "",
    outDir: "",
    run: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      result.help = true;
      continue;
    }
    if (token === "--run") {
      result.run = true;
      continue;
    }
    if (token === "--platform") {
      result.platform = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
      continue;
    }
    if (token === "--device-id") {
      result.deviceId = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (token === "--out-dir") {
      result.outDir = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
  }

  return result;
}

function usage() {
  console.log(
    [
      "Usage: node scripts/mobile/voice-radio-chaos-hardware.mjs [options]",
      "",
      "Options:",
      "  --platform <android|ios>   Target platform (default: android)",
      "  --device-id <id>           Device identifier for adb/ios tooling",
      "  --out-dir <path>           Output directory (default: workstream artifacts timestamp path)",
      "  --run                      Execute impairment actions (without this, script runs in plan-only mode)",
      "  --help                     Show help",
      "",
      "Examples:",
      "  node scripts/mobile/voice-radio-chaos-hardware.mjs --platform android --device-id R3CT30 --run",
      "  node scripts/mobile/voice-radio-chaos-hardware.mjs --platform ios --out-dir tmp/reports/orv-hw-ios",
    ].join("\n"),
  );
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendNdjson(filePath, value) {
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function runCommand(command, args, options = {}) {
  const startedAt = Date.now();
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 8,
      ...options,
    });
    return {
      ok: true,
      command,
      args,
      stdout,
      stderr: "",
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      command,
      args,
      stdout: typeof error?.stdout === "string" ? error.stdout : "",
      stderr: typeof error?.stderr === "string" ? error.stderr : String(error),
      durationMs: Date.now() - startedAt,
    };
  }
}

function resolveAndroidScenarios() {
  return [
    {
      id: "radio_wifi_drop_12s",
      description: "Disable Wi-Fi radio for 12s to force transport interruption and fallback.",
      impair: ["shell", "svc", "wifi", "disable"],
      recover: ["shell", "svc", "wifi", "enable"],
      dwellMs: 12_000,
      expectedTelemetry: [
        "fallback_transition",
        "reconnect",
        "provider_failure:transport_connectivity_failure",
      ],
    },
    {
      id: "radio_cellular_drop_12s",
      description: "Disable mobile data for 12s to force transport reconnection path.",
      impair: ["shell", "svc", "data", "disable"],
      recover: ["shell", "svc", "data", "enable"],
      dwellMs: 12_000,
      expectedTelemetry: [
        "fallback_transition",
        "reconnect",
        "latency_checkpoint:reconnect_roundtrip",
      ],
    },
    {
      id: "radio_toggle_burst_3x",
      description: "Rapid Wi-Fi toggle burst to induce jitter/reorder pressure at link layer.",
      impair: ["shell", "svc", "wifi", "disable"],
      recover: ["shell", "svc", "wifi", "enable"],
      burstCount: 3,
      burstIntervalMs: 2_500,
      dwellMs: 3_000,
      expectedTelemetry: [
        "latency_checkpoint:stream_frame_roundtrip",
        "fallback_transition",
      ],
    },
  ];
}

function resolveIosManualScenarios() {
  return [
    {
      id: "ios_manual_airplane_burst",
      description:
        "On device: toggle Airplane Mode ON for 12s and OFF. Keep app foregrounded in Voice Mode.",
      expectedTelemetry: ["fallback_transition", "reconnect"],
    },
    {
      id: "ios_manual_wifi_only_drop",
      description:
        "On device: disable Wi-Fi for 12s (cellular stays enabled), then restore Wi-Fi.",
      expectedTelemetry: ["reconnect", "latency_checkpoint:reconnect_roundtrip"],
    },
    {
      id: "ios_manual_cellular_drop",
      description:
        "On device: disable cellular data for 12s (Wi-Fi stays disabled), then restore data.",
      expectedTelemetry: ["provider_failure:transport_connectivity_failure", "fallback_transition"],
    },
  ];
}

async function captureAndroidArtifacts(deviceId, outputDir, label) {
  const prefix = deviceId ? ["-s", deviceId] : [];
  const connectivity = runCommand("adb", [...prefix, "shell", "dumpsys", "connectivity"]);
  fs.writeFileSync(
    path.join(outputDir, `${label}.connectivity.txt`),
    `${connectivity.stdout || ""}\n${connectivity.stderr || ""}`,
    "utf8",
  );

  const logcat = runCommand("adb", [...prefix, "logcat", "-d", "-v", "threadtime"]);
  fs.writeFileSync(
    path.join(outputDir, `${label}.logcat.txt`),
    `${logcat.stdout || ""}\n${logcat.stderr || ""}`,
    "utf8",
  );
}

async function runAndroid(args, outputDir, timelineFile) {
  const adbPrefix = args.deviceId ? ["-s", args.deviceId] : [];
  const scenarios = resolveAndroidScenarios();
  if (!args.run) {
    const planned = scenarios.map((scenario) => ({
      ...scenario,
      executed: false,
      status: "PLANNED",
    }));
    writeJson(path.join(outputDir, "android-planned-scenarios.json"), planned);
    appendNdjson(timelineFile, {
      at: new Date().toISOString(),
      type: "android_plan_only",
      count: planned.length,
    });
    return {
      ok: true,
      reason: "plan_only",
      scenarios: planned,
    };
  }

  const commandChecks = [
    runCommand("adb", [...adbPrefix, "get-state"]),
    runCommand("adb", [...adbPrefix, "shell", "getprop", "ro.product.model"]),
  ];
  writeJson(path.join(outputDir, "device-checks.json"), commandChecks);

  if (!commandChecks[0]?.ok) {
    return {
      ok: false,
      reason: "adb_device_unavailable",
      scenarios: [],
    };
  }

  runCommand("adb", [...adbPrefix, "logcat", "-c"]);

  const results = [];
  for (const scenario of scenarios) {
    const scenarioStart = Date.now();
    const row = {
      id: scenario.id,
      description: scenario.description,
      executed: args.run,
      impairOk: false,
      recoverOk: false,
      errors: [],
      expectedTelemetry: scenario.expectedTelemetry,
      startedAt: new Date(scenarioStart).toISOString(),
      endedAt: null,
      durationMs: null,
    };
    appendNdjson(timelineFile, {
      at: new Date().toISOString(),
      type: "scenario_start",
      scenarioId: scenario.id,
      details: scenario.description,
    });

    if (!args.run) {
      row.endedAt = new Date().toISOString();
      row.durationMs = Date.now() - scenarioStart;
      results.push(row);
      appendNdjson(timelineFile, {
        at: new Date().toISOString(),
        type: "scenario_plan_only",
        scenarioId: scenario.id,
      });
      continue;
    }

    if (scenario.burstCount && scenario.burstIntervalMs) {
      for (let index = 0; index < scenario.burstCount; index += 1) {
        const impair = runCommand("adb", [...adbPrefix, ...scenario.impair]);
        if (!impair.ok) {
          row.errors.push(`impair_burst_${index + 1}:${impair.stderr || "failed"}`);
          break;
        }
        await sleep(scenario.burstIntervalMs);
        const recover = runCommand("adb", [...adbPrefix, ...scenario.recover]);
        if (!recover.ok) {
          row.errors.push(`recover_burst_${index + 1}:${recover.stderr || "failed"}`);
          break;
        }
        row.impairOk = true;
        row.recoverOk = true;
        await sleep(1_000);
      }
      await sleep(scenario.dwellMs || 0);
    } else {
      const impair = runCommand("adb", [...adbPrefix, ...scenario.impair]);
      row.impairOk = impair.ok;
      if (!impair.ok) {
        row.errors.push(`impair:${impair.stderr || "failed"}`);
      } else {
        await sleep(scenario.dwellMs || 0);
      }

      const recover = runCommand("adb", [...adbPrefix, ...scenario.recover]);
      row.recoverOk = recover.ok;
      if (!recover.ok) {
        row.errors.push(`recover:${recover.stderr || "failed"}`);
      }
    }

    await captureAndroidArtifacts(args.deviceId, outputDir, scenario.id);

    row.endedAt = new Date().toISOString();
    row.durationMs = Date.now() - scenarioStart;
    results.push(row);
    appendNdjson(timelineFile, {
      at: new Date().toISOString(),
      type: "scenario_end",
      scenarioId: scenario.id,
      impairOk: row.impairOk,
      recoverOk: row.recoverOk,
      errors: row.errors,
    });
  }

  return {
    ok: results.every((row) => row.errors.length === 0),
    reason: "",
    scenarios: results,
  };
}

function runIos(outputDir, timelineFile) {
  const scenarios = resolveIosManualScenarios().map((scenario) => ({
    ...scenario,
    executed: false,
    status: "MANUAL_REQUIRED",
  }));
  appendNdjson(timelineFile, {
    at: new Date().toISOString(),
    type: "ios_manual_required",
    count: scenarios.length,
  });
  writeJson(path.join(outputDir, "ios-manual-scenarios.json"), scenarios);
  return {
    ok: true,
    reason: "manual_steps_generated",
    scenarios,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (args.platform !== "android" && args.platform !== "ios") {
    console.error(`Unsupported platform: ${args.platform}`);
    usage();
    process.exit(1);
  }

  const defaultOutDir = path.join(
    WORKSTREAM_ROOT,
    "artifacts",
    "orv-012",
    "hardware",
    nowIsoSafe(),
  );
  const outDir = args.outDir || defaultOutDir;
  ensureDir(outDir);

  const timelineFile = path.join(outDir, "timeline.ndjson");
  const manifest = {
    generatedAt: new Date().toISOString(),
    platform: args.platform,
    deviceId: args.deviceId || null,
    runMode: args.run ? "execute" : "plan_only",
    outDir,
    workstreamRoot: WORKSTREAM_ROOT,
    expectedInvariants: [
      "liveSessionId and voiceSessionId remain correlated under radio impairment",
      "fallback transition and reconnect telemetry emitted for transport interruption",
      "provider timeout/failure taxonomy remains stable under degraded links",
    ],
  };
  writeJson(path.join(outDir, "manifest.json"), manifest);

  let execution;
  if (args.platform === "android") {
    execution = await runAndroid(args, outDir, timelineFile);
  } else {
    execution = runIos(outDir, timelineFile);
  }

  const summary = {
    ...manifest,
    execution,
  };
  writeJson(path.join(outDir, "summary.json"), summary);

  console.log(`Hardware chaos artifacts written to ${outDir}`);
  if (args.platform === "ios") {
    console.log("iOS manual scenarios generated. Execute on physical device and attach telemetry evidence.");
    process.exit(0);
  }
  if (!execution.ok) {
    console.error("Hardware chaos run completed with failures. Check summary.json.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
