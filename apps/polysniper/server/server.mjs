import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadConfig } from './lib/config.mjs';
import { RiskManager } from './lib/riskManager.mjs';
import { PolymarketExecutionEngine } from './lib/polymarketExecution.mjs';
import { enforcePreTradeSafety } from './lib/preTradeSafety.mjs';
import { writeAuditEvent, ensureDirForFile } from './lib/auditLog.mjs';
import { summarizeExecutionProfile } from './lib/executionProfile.mjs';
import { validateTradeIntent, compileTradeIntentPolicy } from './lib/tradeIntentPolicy.mjs';

const config = loadConfig();
const risk = new RiskManager(config);
const executionEngine = new PolymarketExecutionEngine(config);

ensureDirForFile(config.storage.auditPath);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('invalid_json_body');
  }
}

function logAudit(eventType, payload) {
  return writeAuditEvent(config.storage.auditPath, {
    eventType,
    mode: risk.getMode(),
    killSwitchActive: risk.isKillSwitchActive(),
    ...payload,
  });
}

function buildTrace(input = {}, options = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const trace = {
    chainId: source.decisionChainId || source.chainId || crypto.randomUUID(),
    signalId: source.signalId || crypto.randomUUID(),
    decisionId: crypto.randomUUID(),
  };
  if (options.includeExecution) {
    trace.executionId = crypto.randomUUID();
  }
  if (options.includeAction) {
    trace.actionId = crypto.randomUUID();
  }
  return trace;
}

function buildOperatorApprovalContext() {
  return {
    required: Boolean(config.agentPolicy?.intentsRequireApproval),
    globallyEnabled: Boolean(config.agentPolicy?.intentsGloballyEnabled),
    granted: risk.isAgentIntentApprovalActive(),
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const { method, url } = req;

    if (method === 'GET' && url === '/healthz') {
      return sendJson(res, 200, { ok: true, service: 'polysniper-server' });
    }

    if (method === 'GET' && url === '/v1/status') {
      const executionProfile = summarizeExecutionProfile(config.executionProfile);
      const operatorApproval = buildOperatorApprovalContext();
      return sendJson(res, 200, {
        ...risk.status(),
        executionProfile,
        operatorApproval,
        lastEligibilitySnapshot: executionEngine.getLastEligibilitySnapshot(),
        execution: {
          gammaBaseUrl: config.execution.gammaBaseUrl,
          clobBaseUrl: config.execution.clobBaseUrl,
          clobOrderPath: config.execution.clobOrderPath,
          publicGeoPath: config.execution.publicGeoPath,
          chainId: config.execution.chainId,
          signatureType: config.execution.signatureType,
          useServerTime: config.execution.useServerTime,
          requireGeoOpen: config.execution.requireGeoOpen,
          liveOrderType: config.execution.liveOrderType,
          liveOrderPostOnly: config.execution.liveOrderPostOnly,
          liveOrderDeferExecution: config.execution.liveOrderDeferExecution,
          providerRetryCeiling: config.execution.providerRetryCeiling,
          liveExecutionEnabled: config.execution.enableLiveExecution,
          walletConfigured: Boolean(config.execution.auth.privateKey),
          funderConfigured: Boolean(config.execution.auth.funderAddress),
          apiCredsConfigured: Boolean(
            config.execution.auth.apiKey &&
              config.execution.auth.apiSecret &&
              config.execution.auth.apiPassphrase,
          ),
          deriveApiCreds: Boolean(config.execution.auth.deriveApiCreds),
          geoBlockTokenConfigured: Boolean(config.execution.auth.geoBlockToken),
        },
      });
    }

    if (method === 'POST' && url === '/v1/mode') {
      const body = await readJsonBody(req);
      const nextMode = body.mode;
      if (!['paper_sim', 'staging_synth', 'live_limited'].includes(nextMode)) {
        return sendJson(res, 400, { error: 'invalid_mode' });
      }
      const activeMode = risk.setMode(nextMode);
      logAudit('mode_changed', { nextMode: activeMode });
      return sendJson(res, 200, { mode: activeMode });
    }

    if (method === 'POST' && url === '/v1/kill-switch/activate') {
      const body = await readJsonBody(req);
      const trace = buildTrace(body, { includeAction: true });
      const active = risk.setKillSwitchManual(true);
      const event = logAudit('kill_switch_activated', {
        source: 'manual_api',
        ...trace,
      });
      return sendJson(res, 200, { killSwitchActive: active, trace, eventId: event.eventId });
    }

    if (method === 'POST' && url === '/v1/kill-switch/clear') {
      const body = await readJsonBody(req);
      const trace = buildTrace(body, { includeAction: true });
      const active = risk.setKillSwitchManual(false);
      const event = logAudit('kill_switch_cleared', {
        source: 'manual_api',
        ...trace,
      });
      return sendJson(res, 200, { killSwitchActive: active, trace, eventId: event.eventId });
    }

    if (method === 'POST' && url === '/v1/agent-intents/approval/grant') {
      const body = await readJsonBody(req);
      const trace = buildTrace(body, { includeAction: true });
      const granted = risk.setAgentIntentApprovalManual(true);
      const event = logAudit('agent_intent_approval_granted', {
        source: 'manual_api',
        ...trace,
        operatorApprovalGranted: granted,
      });
      return sendJson(res, 200, { operatorApprovalGranted: granted, trace, eventId: event.eventId });
    }

    if (method === 'POST' && url === '/v1/agent-intents/approval/revoke') {
      const body = await readJsonBody(req);
      const trace = buildTrace(body, { includeAction: true });
      const granted = risk.setAgentIntentApprovalManual(false);
      const event = logAudit('agent_intent_approval_revoked', {
        source: 'manual_api',
        ...trace,
        operatorApprovalGranted: granted,
      });
      return sendJson(res, 200, { operatorApprovalGranted: granted, trace, eventId: event.eventId });
    }

    if (method === 'POST' && url === '/v1/signal/evaluate') {
      const signal = await readJsonBody(req);
      const trace = buildTrace(signal);
      const decision = risk.evaluateSignal(signal);
      const event = logAudit('signal_evaluated', {
        ...trace,
        marketId: signal.marketId || null,
        decisionAction: decision.action,
        riskChecks: decision.checks,
        failedReasons: decision.failedReasons,
        requestedNotionalUsd: decision.requestedNotionalUsd,
        approvedNotionalUsd: decision.approvedNotionalUsd,
        modelTarget: config.model.target,
      });
      return sendJson(res, 200, {
        ...decision,
        trace,
        modelTarget: config.model.target,
        auditEventId: event.eventId,
      });
    }

    if (method === 'POST' && url === '/v1/trade-intents/compile') {
      const body = await readJsonBody(req);
      const trace = buildTrace(body, { includeAction: true });
      const mode = risk.getMode();
      const operatorApproval = buildOperatorApprovalContext();
      const eligibilitySnapshot =
        mode === 'live_limited'
          ? await executionEngine.probeVenueEligibility()
          : {
              checkedAt: new Date().toISOString(),
              classification: 'unknown',
              reason: 'mode_non_live',
              failClosed: true,
              checks: { publicGeo: 'unknown', authenticatedGeo: 'unknown' },
              sources: {},
            };
      const intentValidation = validateTradeIntent(body.tradeIntent || body);
      const intentPolicy = compileTradeIntentPolicy({
        intentValidation,
        executionProfile: config.executionProfile,
        venueEligibility: eligibilitySnapshot,
        runtime: {
          mode,
          killSwitchActive: risk.isKillSwitchActive(),
        },
        operatorApproval,
      });

      const event = logAudit('trade_intent_compiled', {
        ...trace,
        mode,
        executionProfileId: config.executionProfile.id,
        intentId: intentValidation.intent?.intentId || null,
        intentValid: intentValidation.ok,
        intentValidationErrors: intentValidation.errors,
        policyDecisionId: intentPolicy.policyDecisionId,
        policyAllowedAction: intentPolicy.allowedAction,
        policyRejectReasons: intentPolicy.rejectReasons,
        operatorApprovalRequired: operatorApproval.required,
        operatorApprovalGranted: operatorApproval.granted,
        eligibilitySnapshot,
      });

      return sendJson(res, 200, {
        trace,
        intentValidation,
        intentPolicy,
        eligibilitySnapshot,
        auditEventId: event.eventId,
      });
    }

    if (method === 'POST' && url === '/v1/trades/paper/execute') {
      const signal = await readJsonBody(req);
      const trace = buildTrace(signal, { includeExecution: true });
      const decision = risk.evaluateSignal(signal);
      const execution = risk.executePaperTrade(signal, decision);
      const event = logAudit('paper_trade_execute', {
        ...trace,
        marketId: signal.marketId || null,
        decisionAction: decision.action,
        riskChecks: decision.checks,
        failedReasons: decision.failedReasons,
        orderIntent: {
          marketId: signal.marketId || null,
          side: signal.side || 'YES',
          requestedNotionalUsd: decision.requestedNotionalUsd,
          approvedNotionalUsd: decision.approvedNotionalUsd,
          strategy: signal.strategy || 'unspecified',
        },
        executionStatus: execution.status,
        executionReason: execution.reason || null,
        executionPositionId: execution.position?.positionId || null,
        approvedNotionalUsd: decision.approvedNotionalUsd,
      });
      return sendJson(res, 200, {
        decision,
        execution,
        trace,
        auditEventId: event.eventId,
      });
    }

    if (method === 'POST' && url === '/v1/trades/execute') {
      const signal = await readJsonBody(req);
      const trace = buildTrace(signal, { includeExecution: true });
      const mode = risk.getMode();
      const decision = risk.evaluateSignal(signal);
      const operatorApproval = buildOperatorApprovalContext();
      const eligibilitySnapshot =
        mode === 'live_limited'
          ? await executionEngine.probeVenueEligibility()
          : {
              checkedAt: new Date().toISOString(),
              classification: 'unknown',
              reason: 'mode_non_live',
              failClosed: true,
              checks: { publicGeo: 'unknown', authenticatedGeo: 'unknown' },
              sources: {},
            };

      const intentValidation = signal.tradeIntent ? validateTradeIntent(signal.tradeIntent) : null;
      const intentPolicy = signal.tradeIntent
        ? compileTradeIntentPolicy({
            intentValidation,
            executionProfile: config.executionProfile,
            venueEligibility: eligibilitySnapshot,
            runtime: {
              mode,
              killSwitchActive: risk.isKillSwitchActive(),
            },
            operatorApproval,
          })
        : null;

      const safetyGate = enforcePreTradeSafety(decision, {
        mode,
        executionProfile: config.executionProfile,
        venueEligibility: eligibilitySnapshot,
        intentPolicy,
      });

      const effectiveDecision = safetyGate.allowOrder
        ? decision
        : {
            ...decision,
            action: 'HOLD',
            failedReasons: [...new Set([...(decision.failedReasons || []), ...safetyGate.failedReasons])],
          };

      const syntheticExecution =
        mode === 'live_limited' ? null : risk.executePaperTrade(signal, effectiveDecision);
      const adapterExecution = await executionEngine.execute(signal, effectiveDecision, mode, {
        eligibilitySnapshot,
        executionProfile: config.executionProfile,
      });

      const event = logAudit('trade_execute', {
        ...trace,
        marketId: signal.marketId || null,
        mode,
        executionProfileId: config.executionProfile.id,
        executionProfileStatus: config.executionProfile.status,
        eligibilitySnapshot,
        intentId: intentValidation?.intent?.intentId || null,
        intentValidationErrors: intentValidation?.errors || [],
        policyDecisionId: intentPolicy?.policyDecisionId || null,
        policyAllowedAction: intentPolicy?.allowedAction || null,
        policyRejectReasons: intentPolicy?.rejectReasons || [],
        operatorApprovalRequired: operatorApproval.required,
        operatorApprovalGranted: operatorApproval.granted,
        decisionAction: effectiveDecision.action,
        riskChecks: effectiveDecision.checks,
        failedReasons: effectiveDecision.failedReasons,
        safetyGateReason: safetyGate.reason,
        safetyGateAllowOrder: safetyGate.allowOrder,
        safetyGateFailedReasons: safetyGate.failedReasons,
        orderIntent: adapterExecution.orderIntent || null,
        adapterExecutionStatus: adapterExecution.status,
        adapterExecutionReason: adapterExecution.reason || null,
        adapterFailSafeClassification: adapterExecution.failSafe?.classification || null,
        adapterFailSafeRetryExhausted: adapterExecution.failSafe?.retry?.exhausted || false,
        syntheticExecutionStatus: syntheticExecution?.status || null,
        approvedNotionalUsd: effectiveDecision.approvedNotionalUsd,
      });

      return sendJson(res, 200, {
        decision: effectiveDecision,
        safetyGate,
        trace,
        executionProfile: summarizeExecutionProfile(config.executionProfile),
        eligibilitySnapshot,
        intentValidation,
        intentPolicy,
        operatorApproval,
        failSafe: {
          preTrade: safetyGate,
          execution: adapterExecution.failSafe || null,
        },
        execution: {
          adapter: adapterExecution,
          synthetic: syntheticExecution,
        },
        auditEventId: event.eventId,
      });
    }

    if (method === 'POST' && url === '/v1/trades/close') {
      const body = await readJsonBody(req);
      if (!body.positionId) {
        return sendJson(res, 400, { error: 'position_id_required' });
      }
      const result = risk.closePosition(body.positionId);
      const event = logAudit('position_close', {
        positionId: body.positionId,
        closed: result.closed,
      });
      return sendJson(res, result.closed ? 200 : 404, {
        ...result,
        auditEventId: event.eventId,
      });
    }

    return sendJson(res, 404, { error: 'not_found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    logAudit('server_error', { message });
    return sendJson(res, 500, { error: message });
  }
});

server.listen(config.server.port, config.server.host, () => {
  logAudit('server_started', {
    host: config.server.host,
    port: config.server.port,
    ledgerPath: config.storage.ledgerPath,
    auditPath: config.storage.auditPath,
    killSwitchFlagPath: config.runtime.killSwitchFlagPath,
    executionProfileId: config.executionProfile.id,
    executionProfileStatus: config.executionProfile.status,
  });
  // eslint-disable-next-line no-console
  console.log(`polysniper-server listening on http://${config.server.host}:${config.server.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logAudit('server_stopping', { signal });
    server.close(() => process.exit(0));
  });
}
