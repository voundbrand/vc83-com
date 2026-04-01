import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const HOST = '127.0.0.1';
const PORT = 8799;
const BASE = `http://${HOST}:${PORT}`;
const DATA_DIR = path.join(os.tmpdir(), `polysniper-server-smoke-${Date.now()}`);
const TRACE_CHAIN_ID = `smoke-chain-${Date.now()}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
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

async function json(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json();
  return { status: res.status, payload };
}

const child = spawn('node', ['apps/polysniper/server/server.mjs'], {
  env: {
    ...process.env,
    PSNP_SERVER_HOST: HOST,
    PSNP_SERVER_PORT: String(PORT),
    PSNP_DATA_DIR: DATA_DIR,
    PSNP_TRADING_KILL_SWITCH: '0',
    PSNP_EXECUTION_PROFILE_ID: 'smoke_profile',
    PSNP_EXECUTION_PROFILE_STATUS: 'ACTIVE',
    PSNP_EXECUTION_PROFILE_AGENT_INTENTS_ENABLED: '1',
    PSNP_AGENT_INTENTS_GLOBAL_ENABLED: '1',
    PSNP_AGENT_INTENTS_REQUIRE_APPROVAL: '1',
  },
  stdio: 'pipe',
});

child.stdout.on('data', (chunk) => process.stdout.write(chunk));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));

let exitCode = 0;

try {
  await waitForHealth();

  const status0 = await json('GET', '/v1/status');
  if (status0.status !== 200 || status0.payload.mode !== 'paper_sim') {
    throw new Error('unexpected_initial_status');
  }
  if (status0.payload.executionProfile?.id !== 'smoke_profile') {
    throw new Error('expected_execution_profile_id');
  }

  const compiledMissingApproval = await json('POST', '/v1/trade-intents/compile', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-intent-compile-missing-approval',
    tradeIntent: {
      intentId: 'intent-missing-approval',
      source: 'openclaw_agent',
      action: 'OPEN_POSITION',
      marketId: 'mkt-intent-1',
      side: 'YES',
      requestedNotionalUsd: 5,
      executionProfileId: 'smoke_profile',
      strategy: 'intent-strategy',
    },
  });
  if (compiledMissingApproval.payload.intentPolicy?.allowedAction !== 'DENY') {
    throw new Error('expected_intent_policy_deny_without_approval');
  }
  if (
    !Array.isArray(compiledMissingApproval.payload.intentPolicy?.rejectReasons) ||
    !compiledMissingApproval.payload.intentPolicy.rejectReasons.includes('operator_approval_missing')
  ) {
    throw new Error('expected_operator_approval_missing_reason');
  }

  const grantApproval = await json('POST', '/v1/agent-intents/approval/grant', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-approval-grant',
  });
  if (!grantApproval.payload.operatorApprovalGranted) {
    throw new Error('expected_operator_approval_granted');
  }

  const compiledApproved = await json('POST', '/v1/trade-intents/compile', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-intent-compile-approved',
    tradeIntent: {
      intentId: 'intent-approved',
      source: 'openclaw_agent',
      action: 'OPEN_POSITION',
      marketId: 'mkt-intent-2',
      side: 'YES',
      requestedNotionalUsd: 5,
      executionProfileId: 'smoke_profile',
      strategy: 'intent-strategy',
    },
  });
  if (compiledApproved.payload.intentPolicy?.allowedAction !== 'ALLOW_ORDER') {
    throw new Error('expected_intent_policy_allow_with_approval');
  }

  const evalOk = await json('POST', '/v1/signal/evaluate', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-eval-ok',
    marketId: 'mkt-1',
    side: 'YES',
    edgePct: 6,
    confidencePct: 80,
    modelConfidence: 0.9,
    requestedNotionalUsd: 10,
    providerHealthy: true,
  });
  if (evalOk.payload.action !== 'PLACE_ORDER') {
    throw new Error('expected_place_order');
  }
  if (evalOk.payload.trace?.chainId !== TRACE_CHAIN_ID) {
    throw new Error('expected_trace_chain_id_on_evaluate');
  }

  const execUnified = await json('POST', '/v1/trades/execute', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-exec-unified',
    marketId: 'mkt-1-unified',
    side: 'YES',
    edgePct: 6,
    confidencePct: 80,
    modelConfidence: 0.9,
    requestedNotionalUsd: 10,
    strategy: 's12-unified',
    providerHealthy: true,
    tradeIntent: {
      intentId: 'intent-exec-allow',
      source: 'openclaw_agent',
      action: 'OPEN_POSITION',
      marketId: 'mkt-1-unified',
      side: 'YES',
      requestedNotionalUsd: 10,
      executionProfileId: 'smoke_profile',
      strategy: 's12-unified',
    },
  });
  if (execUnified.payload.execution?.adapter?.status !== 'paper_simulated') {
    throw new Error('expected_unified_paper_simulation');
  }
  if (execUnified.payload.execution?.synthetic?.status !== 'paper_filled') {
    throw new Error('expected_unified_synthetic_fill');
  }
  if (execUnified.payload.safetyGate?.allowOrder !== true) {
    throw new Error('expected_unified_safety_gate_allow');
  }
  if (execUnified.payload.trace?.chainId !== TRACE_CHAIN_ID) {
    throw new Error('expected_trace_chain_id_on_execute');
  }
  if (!execUnified.payload.trace?.executionId) {
    throw new Error('expected_execute_trace_execution_id');
  }
  if (execUnified.payload.intentPolicy?.allowedAction !== 'ALLOW_ORDER') {
    throw new Error('expected_execute_intent_policy_allow');
  }

  const execCapBlocked = await json('POST', '/v1/trades/execute', {
    marketId: 'mkt-1-cap',
    side: 'YES',
    edgePct: 6,
    confidencePct: 80,
    modelConfidence: 0.9,
    requestedNotionalUsd: 20,
    strategy: 's12-cap',
    providerHealthy: true,
  });
  if (execCapBlocked.payload.decision?.action !== 'HOLD') {
    throw new Error('expected_unified_hold_on_trade_cap');
  }
  if (execCapBlocked.payload.safetyGate?.allowOrder !== false) {
    throw new Error('expected_unified_safety_gate_block');
  }
  if (
    !Array.isArray(execCapBlocked.payload.safetyGate?.failedReasons) ||
    !execCapBlocked.payload.safetyGate.failedReasons.some((reason) =>
      String(reason).includes('requested_above_max_trade'),
    )
  ) {
    throw new Error('expected_unified_trade_cap_reason');
  }
  if (execCapBlocked.payload.execution?.adapter?.status !== 'not_executed') {
    throw new Error('expected_unified_not_executed_on_cap');
  }

  const execProviderBlocked = await json('POST', '/v1/trades/execute', {
    marketId: 'mkt-1-provider',
    side: 'YES',
    edgePct: 6,
    confidencePct: 80,
    modelConfidence: 0.9,
    requestedNotionalUsd: 10,
    strategy: 's12-provider',
    providerHealthy: false,
  });
  if (execProviderBlocked.payload.decision?.action !== 'HOLD') {
    throw new Error('expected_unified_hold_on_provider_failure');
  }
  if (execProviderBlocked.payload.failSafe?.execution?.classification !== 'provider_unhealthy') {
    throw new Error('expected_provider_unhealthy_classification');
  }

  const exec = await json('POST', '/v1/trades/paper/execute', {
    marketId: 'mkt-1',
    side: 'YES',
    edgePct: 6,
    confidencePct: 80,
    modelConfidence: 0.9,
    requestedNotionalUsd: 10,
    strategy: 's12',
    providerHealthy: true,
  });
  if (exec.payload.execution.status !== 'paper_filled') {
    throw new Error('expected_paper_fill');
  }

  const killOn = await json('POST', '/v1/kill-switch/activate', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-kill-on',
  });
  if (!killOn.payload.killSwitchActive) {
    throw new Error('expected_kill_switch_active');
  }
  if (!killOn.payload.trace?.actionId) {
    throw new Error('expected_kill_switch_trace_action_id');
  }

  const evalBlocked = await json('POST', '/v1/signal/evaluate', {
    marketId: 'mkt-2',
    side: 'NO',
    edgePct: 8,
    confidencePct: 90,
    modelConfidence: 0.95,
    requestedNotionalUsd: 10,
    providerHealthy: true,
  });
  if (evalBlocked.payload.action !== 'HOLD') {
    throw new Error('expected_hold_under_kill_switch');
  }

  const execBlocked = await json('POST', '/v1/trades/execute', {
    marketId: 'mkt-2',
    side: 'NO',
    edgePct: 8,
    confidencePct: 90,
    modelConfidence: 0.95,
    requestedNotionalUsd: 10,
    providerHealthy: true,
  });
  if (execBlocked.payload.decision?.action !== 'HOLD') {
    throw new Error('expected_unified_hold_under_kill_switch');
  }
  if (execBlocked.payload.safetyGate?.allowOrder !== false) {
    throw new Error('expected_unified_kill_switch_gate_block');
  }
  if (
    !Array.isArray(execBlocked.payload.safetyGate?.failedReasons) ||
    !execBlocked.payload.safetyGate.failedReasons.includes('kill_switch_active')
  ) {
    throw new Error('expected_unified_kill_switch_reason');
  }
  if (execBlocked.payload.execution?.adapter?.status !== 'not_executed') {
    throw new Error('expected_unified_not_executed_under_kill_switch');
  }

  const revokeApproval = await json('POST', '/v1/agent-intents/approval/revoke', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-approval-revoke',
  });
  if (revokeApproval.payload.operatorApprovalGranted) {
    throw new Error('expected_operator_approval_revoked');
  }

  const killOff = await json('POST', '/v1/kill-switch/clear', {
    decisionChainId: TRACE_CHAIN_ID,
    signalId: 'signal-kill-off',
  });
  if (killOff.payload.killSwitchActive) {
    throw new Error('expected_kill_switch_cleared');
  }

  const status1 = await json('GET', '/v1/status');
  if (status1.payload.openPositions < 1) {
    throw new Error('expected_open_position_after_trade');
  }

  console.log('SMOKE_OK');
} catch (error) {
  exitCode = 1;
  console.error('SMOKE_FAIL', error instanceof Error ? error.message : error);
} finally {
  child.kill('SIGTERM');
  await wait(500);
  process.exit(exitCode);
}
