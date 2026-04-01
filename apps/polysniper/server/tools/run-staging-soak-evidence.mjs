import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');

const MOCK_HOST = '127.0.0.1';
const MOCK_PORT = 8805;
const APP_HOST = '127.0.0.1';
const APP_PORT = 8799;
const APP_BASE = `http://${APP_HOST}:${APP_PORT}`;
const DATA_DIR = path.join(os.tmpdir(), `polysniper-stg-soak-${Date.now()}`);

const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const runId = `STGSOAK-${stamp}-v2`;
const evidenceDir = path.join(
  repoRoot,
  'apps',
  'polysniper',
  'docs',
  'nemoclaw_polysniper_plan',
  'evidence',
  'staging_soak',
  runId,
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeJson(filepath, payload) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function waitForHealth(timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${APP_BASE}/healthz`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await wait(200);
  }
  throw new Error('health_timeout');
}

async function json(method, route, body) {
  const res = await fetch(`${APP_BASE}${route}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json();
  return { status: res.status, payload };
}

function parseUrl(reqUrl) {
  const parsed = new URL(reqUrl, `http://${MOCK_HOST}:${MOCK_PORT}`);
  return { pathname: parsed.pathname, searchParams: parsed.searchParams };
}

function send(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function startMockServer() {
  const server = http.createServer((req, res) => {
    const { pathname, searchParams } = parseUrl(req.url || '/');
    const tokenId = String(searchParams.get('token_id') || searchParams.get('clob_token_ids') || '');

    if (pathname === '/markets') {
      if (tokenId.includes('gamma_fail')) {
        return send(res, 503, { error: 'gamma_fail_injected' });
      }
      return send(res, 200, [
        {
          id: `market-${tokenId || 'default'}`,
          question: 'Mock market',
          active: true,
          closed: false,
          archived: false,
          clobTokenIds: [tokenId || 'token_nominal'],
        },
      ]);
    }

    if (pathname === '/book') {
      if (tokenId.includes('book_fail')) {
        return send(res, 503, { error: 'book_fail_injected' });
      }
      return send(res, 200, {
        bids: [
          [0.49, 100],
          [0.48, 100],
        ],
        asks: [
          [0.51, 100],
          [0.52, 100],
        ],
      });
    }

    if (pathname === '/midpoint') {
      if (tokenId.includes('book_fail')) {
        return send(res, 503, { error: 'mid_fail_injected' });
      }
      return send(res, 200, { mid: 0.5 });
    }

    if (pathname === '/closed-only') {
      return send(res, 200, { closed_only: false, allowed: true });
    }

    return send(res, 404, { error: 'not_found' });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(MOCK_PORT, MOCK_HOST, () => resolve(server));
  });
}

const app = spawn('node', ['apps/polysniper/server/server.mjs'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PSNP_SERVER_HOST: APP_HOST,
    PSNP_SERVER_PORT: String(APP_PORT),
    PSNP_DATA_DIR: DATA_DIR,
    PSNP_RUNTIME_MODE: 'staging_synth',
    PSNP_TRADING_KILL_SWITCH: '0',
    PSNP_EXECUTION_PROFILE_ID: 'staging_profile',
    PSNP_EXECUTION_PROFILE_STATUS: 'ACTIVE',
    PSNP_EXECUTION_PROFILE_AGENT_INTENTS_ENABLED: '1',
    PSNP_AGENT_INTENTS_GLOBAL_ENABLED: '1',
    PSNP_AGENT_INTENTS_REQUIRE_APPROVAL: '0',
    PSNP_POLY_GAMMA_BASE_URL: `http://${MOCK_HOST}:${MOCK_PORT}`,
    PSNP_POLY_CLOB_BASE_URL: `http://${MOCK_HOST}:${MOCK_PORT}`,
    PSNP_POLY_PUBLIC_GEO_PATH: '/closed-only',
    PSNP_POLY_REQUIRE_OPEN_ONLY: '1',
    PSNP_ENABLE_LIVE_EXECUTION: '0',
    PSNP_POLY_REQUEST_TIMEOUT_MS: '1500',
  },
  stdio: 'pipe',
});

app.stdout.on('data', (chunk) => process.stdout.write(chunk));
app.stderr.on('data', (chunk) => process.stderr.write(chunk));

let exitCode = 0;
let mockServer = null;

try {
  mockServer = await startMockServer();
  await waitForHealth();

  const nominal = [];
  const faults = [];

  for (let i = 0; i < 100; i += 1) {
    const tokenId = `token_nominal_${i + 1}`;
    const response = await json('POST', '/v1/trades/execute', {
      marketId: `mkt-nominal-${i + 1}`,
      clobTokenId: tokenId,
      side: i % 2 === 0 ? 'YES' : 'NO',
      edgePct: 6,
      confidencePct: 80,
      modelConfidence: 0.9,
      requestedNotionalUsd: 0.5,
      providerHealthy: true,
      strategy: 'staging_soak_nominal',
    });
    if (response.payload?.execution?.synthetic?.position?.positionId) {
      await json('POST', '/v1/trades/close', {
        positionId: response.payload.execution.synthetic.position.positionId,
      });
    }
    nominal.push({
      id: `nominal-${i + 1}`,
      httpStatus: response.status,
      decisionAction: response.payload?.decision?.action || null,
      adapterStatus: response.payload?.execution?.adapter?.status || null,
      failSafeClassification: response.payload?.failSafe?.execution?.classification || null,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const response = await json('POST', '/v1/trades/execute', {
      marketId: `mkt-gamma-fault-${i + 1}`,
      clobTokenId: `token_gamma_fail_${i + 1}`,
      side: 'YES',
      edgePct: 6,
      confidencePct: 80,
      modelConfidence: 0.9,
      requestedNotionalUsd: 0.5,
      providerHealthy: true,
      strategy: 'staging_soak_gamma_fault',
    });
    faults.push({
      id: `gamma-fault-${i + 1}`,
      type: 'gamma',
      httpStatus: response.status,
      adapterStatus: response.payload?.execution?.adapter?.status || null,
      failSafeClassification: response.payload?.failSafe?.execution?.classification || null,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const response = await json('POST', '/v1/trades/execute', {
      marketId: `mkt-book-fault-${i + 1}`,
      clobTokenId: `token_book_fail_${i + 1}`,
      side: 'YES',
      edgePct: 6,
      confidencePct: 80,
      modelConfidence: 0.9,
      requestedNotionalUsd: 0.5,
      providerHealthy: true,
      strategy: 'staging_soak_book_fault',
    });
    faults.push({
      id: `book-fault-${i + 1}`,
      type: 'clob',
      httpStatus: response.status,
      adapterStatus: response.payload?.execution?.adapter?.status || null,
      failSafeClassification: response.payload?.failSafe?.execution?.classification || null,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const response = await json('POST', '/v1/trades/execute', {
      marketId: `mkt-provider-fault-${i + 1}`,
      clobTokenId: `token_provider_fault_${i + 1}`,
      side: 'YES',
      edgePct: 6,
      confidencePct: 80,
      modelConfidence: 0.9,
      requestedNotionalUsd: 0.5,
      providerHealthy: false,
      strategy: 'staging_soak_provider_fault',
    });
    faults.push({
      id: `provider-fault-${i + 1}`,
      type: 'provider',
      httpStatus: response.status,
      adapterStatus: response.payload?.execution?.adapter?.status || null,
      failSafeClassification: response.payload?.failSafe?.execution?.classification || null,
    });
  }

  const nominalFailures = nominal.filter(
    (item) =>
      item.httpStatus !== 200 ||
      item.decisionAction !== 'PLACE_ORDER' ||
      item.adapterStatus !== 'staging_synth_simulated',
  );
  const faultFailures = faults.filter((item) => item.httpStatus !== 200 || !item.adapterStatus);

  const summary = {
    runId,
    generatedAt: now.toISOString(),
    nominalCycles: nominal.length,
    faultInjections: faults.length,
    nominalFailures: nominalFailures.length,
    faultFailures: faultFailures.length,
    allPass:
      nominal.length >= 100 &&
      faults.length >= 15 &&
      nominalFailures.length === 0 &&
      faultFailures.length === 0,
  };

  writeJson(path.join(evidenceDir, 'RUN_METADATA.json'), {
    runId,
    generatedAt: now.toISOString(),
    nominalTarget: 100,
    faultTarget: 15,
    mode: 'staging_synth',
    script: 'apps/polysniper/server/tools/run-staging-soak-evidence.mjs',
  });
  writeJson(path.join(evidenceDir, 'SOAK_RESULTS.json'), {
    summary,
    nominal,
    nominalFailures,
  });
  writeJson(path.join(evidenceDir, 'FAULT_INJECTION_RESULTS.json'), {
    faults,
    faultFailures,
  });
  const summaryMd = `# Staging Soak Evidence\n\n- Run ID: \`${runId}\`\n- Generated at: \`${now.toISOString()}\`\n- Nominal cycles: \`${summary.nominalCycles}\`\n- Fault injections: \`${summary.faultInjections}\`\n- Nominal failures: \`${summary.nominalFailures}\`\n- Fault failures: \`${summary.faultFailures}\`\n- All pass: \`${summary.allPass}\`\n`;
  fs.writeFileSync(path.join(evidenceDir, 'SUMMARY.md'), summaryMd, 'utf8');

  if (!summary.allPass) {
    throw new Error(`staging_soak_failed:${summary.nominalFailures + summary.faultFailures}`);
  }

  console.log(`STGSOAK_OK ${runId}`);
} catch (error) {
  exitCode = 1;
  console.error('STGSOAK_FAIL', error instanceof Error ? error.message : error);
} finally {
  if (mockServer) {
    await new Promise((resolve) => mockServer.close(resolve));
  }
  app.kill('SIGTERM');
  await wait(500);
  process.exit(exitCode);
}
