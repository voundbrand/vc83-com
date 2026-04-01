import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');

const HOST = '127.0.0.1';
const PORT = 8799;
const BASE = `http://${HOST}:${PORT}`;
const DATA_DIR = path.join(os.tmpdir(), `polysniper-local-dryrun-${Date.now()}`);
const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const runId = `LDR-${stamp}-v1`;
const evidenceDir = path.join(
  repoRoot,
  'apps',
  'polysniper',
  'docs',
  'nemoclaw_polysniper_plan',
  'evidence',
  'local_docker',
  runId,
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/healthz`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await wait(200);
  }
  throw new Error('health_timeout');
}

async function json(method, route, body) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json();
  return { status: res.status, payload };
}

function writeJson(filepath, payload) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function buildScenarios() {
  const scenarios = [];
  for (let i = 0; i < 20; i += 1) {
    scenarios.push({
      id: `allow-${i + 1}`,
      expectedAction: 'PLACE_ORDER',
      request: {
        marketId: `mkt-allow-${i + 1}`,
        side: i % 2 === 0 ? 'YES' : 'NO',
        edgePct: 6,
        confidencePct: 80,
        modelConfidence: 0.9,
        requestedNotionalUsd: 1,
        providerHealthy: true,
        strategy: 'local_dryrun_allow',
      },
    });
  }
  for (let i = 0; i < 5; i += 1) {
    scenarios.push({
      id: `cap-deny-${i + 1}`,
      expectedAction: 'HOLD',
      request: {
        marketId: `mkt-cap-${i + 1}`,
        side: 'YES',
        edgePct: 6,
        confidencePct: 80,
        modelConfidence: 0.9,
        requestedNotionalUsd: 20,
        providerHealthy: true,
        strategy: 'local_dryrun_cap_deny',
      },
    });
  }
  for (let i = 0; i < 5; i += 1) {
    scenarios.push({
      id: `provider-deny-${i + 1}`,
      expectedAction: 'HOLD',
      request: {
        marketId: `mkt-provider-${i + 1}`,
        side: 'YES',
        edgePct: 6,
        confidencePct: 80,
        modelConfidence: 0.9,
        requestedNotionalUsd: 10,
        providerHealthy: false,
        strategy: 'local_dryrun_provider_deny',
      },
    });
  }
  return scenarios;
}

const child = spawn('node', ['apps/polysniper/server/server.mjs'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PSNP_SERVER_HOST: HOST,
    PSNP_SERVER_PORT: String(PORT),
    PSNP_DATA_DIR: DATA_DIR,
    PSNP_RUNTIME_MODE: 'paper_sim',
    PSNP_TRADING_KILL_SWITCH: '0',
    PSNP_EXECUTION_PROFILE_ID: 'dryrun_profile',
    PSNP_EXECUTION_PROFILE_STATUS: 'ACTIVE',
    PSNP_EXECUTION_PROFILE_AGENT_INTENTS_ENABLED: '1',
    PSNP_AGENT_INTENTS_GLOBAL_ENABLED: '1',
    PSNP_AGENT_INTENTS_REQUIRE_APPROVAL: '0',
  },
  stdio: 'pipe',
});

child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));

let exitCode = 0;

try {
  await waitForHealth();
  const scenarios = buildScenarios();
  const results = [];

  for (const scenario of scenarios) {
    const response = await json('POST', '/v1/trades/execute', scenario.request);
    if (
      scenario.expectedAction === 'PLACE_ORDER' &&
      response.payload?.execution?.synthetic?.position?.positionId
    ) {
      await json('POST', '/v1/trades/close', {
        positionId: response.payload.execution.synthetic.position.positionId,
      });
    }
    results.push({
      id: scenario.id,
      expectedAction: scenario.expectedAction,
      httpStatus: response.status,
      action: response.payload?.decision?.action || null,
      safetyGateAllowOrder: response.payload?.safetyGate?.allowOrder ?? null,
      adapterStatus: response.payload?.execution?.adapter?.status || null,
      syntheticStatus: response.payload?.execution?.synthetic?.status || null,
      failedReasons: response.payload?.decision?.failedReasons || [],
    });
  }

  const status = await json('GET', '/v1/status');
  const failed = results.filter((item) => {
    if (item.httpStatus !== 200) return true;
    if (item.expectedAction !== item.action) return true;
    if (item.expectedAction === 'PLACE_ORDER') {
      return !(item.safetyGateAllowOrder === true && item.adapterStatus === 'paper_simulated');
    }
    return !(item.safetyGateAllowOrder === false && item.adapterStatus === 'not_executed');
  });

  const summary = {
    runId,
    generatedAt: now.toISOString(),
    totalScenarios: results.length,
    expectedMinimum: 30,
    passedScenarios: results.length - failed.length,
    failedScenarios: failed.length,
    allPass: failed.length === 0 && results.length >= 30,
    openPositionsAfterRun: status.payload?.openPositions ?? null,
    mode: status.payload?.mode ?? null,
  };

  writeJson(path.join(evidenceDir, 'RUN_METADATA.json'), {
    runId,
    generatedAt: now.toISOString(),
    scenarioCount: scenarios.length,
    mode: 'paper_sim',
    script: 'apps/polysniper/server/tools/run-local-dry-run-evidence.mjs',
  });
  writeJson(path.join(evidenceDir, 'SIGNAL_REPLAY_RESULTS.json'), {
    summary,
    results,
    failed,
  });
  writeJson(path.join(evidenceDir, 'SAFETY_GATE_RESULTS.json'), {
    totalFailedReasons: results.reduce((sum, item) => sum + item.failedReasons.length, 0),
    failedReasonHistogram: results
      .flatMap((item) => item.failedReasons)
      .reduce((acc, reason) => ({ ...acc, [reason]: (acc[reason] || 0) + 1 }), {}),
  });

  const summaryMd = `# Local Dry-Run Evidence\n\n- Run ID: \`${runId}\`\n- Generated at: \`${now.toISOString()}\`\n- Total scenarios: \`${summary.totalScenarios}\`\n- Passed: \`${summary.passedScenarios}\`\n- Failed: \`${summary.failedScenarios}\`\n- All pass: \`${summary.allPass}\`\n`;
  fs.writeFileSync(path.join(evidenceDir, 'SUMMARY.md'), summaryMd, 'utf8');

  if (!summary.allPass) {
    throw new Error(`dry_run_failed:${summary.failedScenarios}`);
  }

  console.log(`LDR_OK ${runId}`);
} catch (error) {
  exitCode = 1;
  console.error('LDR_FAIL', error instanceof Error ? error.message : error);
} finally {
  child.kill('SIGTERM');
  await wait(500);
  process.exit(exitCode);
}
