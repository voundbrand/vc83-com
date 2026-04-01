import fs from 'node:fs';
import crypto from 'node:crypto';

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function safeNumber(input, fallback = 0) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

export class RiskManager {
  constructor(config) {
    this.config = config;
    this.state = this.#loadState();
  }

  #defaultState() {
    return {
      version: 1,
      mode: this.config.runtime.mode,
      killSwitchManual: false,
      agentIntentApprovalManual: false,
      dailyVolumeByUtcDate: {},
      openPositions: [],
      trades: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  #loadState() {
    try {
      if (fs.existsSync(this.config.storage.ledgerPath)) {
        return JSON.parse(fs.readFileSync(this.config.storage.ledgerPath, 'utf8'));
      }
    } catch {
      // fall through to default
    }
    const state = this.#defaultState();
    this.#saveState(state);
    return state;
  }

  #saveState(nextState = this.state) {
    nextState.updatedAt = new Date().toISOString();
    fs.mkdirSync(this.config.storage.dataDir, { recursive: true });
    fs.writeFileSync(this.config.storage.ledgerPath, JSON.stringify(nextState, null, 2), 'utf8');
  }

  isKillSwitchActive() {
    const envActive = String(this.config.runtime.killSwitchEnvValue) === '1';
    const flagActive = fs.existsSync(this.config.runtime.killSwitchFlagPath);
    return this.state.killSwitchManual || envActive || flagActive;
  }

  setKillSwitchManual(active) {
    this.state.killSwitchManual = Boolean(active);
    this.#saveState();
    return this.isKillSwitchActive();
  }

  setMode(mode) {
    this.state.mode = mode;
    this.#saveState();
    return this.state.mode;
  }

  setAgentIntentApprovalManual(active) {
    this.state.agentIntentApprovalManual = Boolean(active);
    this.#saveState();
    return this.isAgentIntentApprovalActive();
  }

  isAgentIntentApprovalActive() {
    return Boolean(this.state.agentIntentApprovalManual);
  }

  getMode() {
    return this.state.mode;
  }

  getTodayVolumeUsd() {
    return safeNumber(this.state.dailyVolumeByUtcDate[utcDayKey()], 0);
  }

  getOpenRiskUsd() {
    return this.state.openPositions.reduce(
      (sum, position) => sum + safeNumber(position.notionalUsd, 0),
      0,
    );
  }

  status() {
    return {
      mode: this.getMode(),
      killSwitchActive: this.isKillSwitchActive(),
      limits: this.config.limits,
      todayVolumeUsd: this.getTodayVolumeUsd(),
      openRiskUsd: this.getOpenRiskUsd(),
      openPositions: this.state.openPositions.length,
      prepaidBalanceUsd: this.config.limits.prepaidBalanceUsd,
      reserveFloorUsd: this.config.limits.reserveFloorUsd,
      modelTarget: this.config.model.target,
      executionProfile: this.config.executionProfile,
      agentPolicy: {
        intentsRequireApproval: Boolean(this.config.agentPolicy?.intentsRequireApproval),
        intentsGloballyEnabled: Boolean(this.config.agentPolicy?.intentsGloballyEnabled),
        operatorApprovalActive: this.isAgentIntentApprovalActive(),
      },
      updatedAt: this.state.updatedAt,
    };
  }

  evaluateSignal(signal) {
    const requested = safeNumber(signal.requestedNotionalUsd, 0);
    const edgePct = safeNumber(signal.edgePct, 0);
    const confidencePct = safeNumber(signal.confidencePct, 0);
    const modelConfidence = safeNumber(signal.modelConfidence, 1);
    const providerHealthy = signal.providerHealthy !== false;

    const checks = {
      killSwitch: { pass: true, reason: 'ok' },
      providerHealth: { pass: true, reason: 'ok' },
      modelConfidence: { pass: true, reason: 'ok' },
      minimumEdge: { pass: true, reason: 'ok' },
      minimumConfidence: { pass: true, reason: 'ok' },
      maxTradeNotional: { pass: true, reason: 'ok' },
      maxDailyNotional: { pass: true, reason: 'ok' },
      maxOpenRisk: { pass: true, reason: 'ok' },
      maxOpenPositions: { pass: true, reason: 'ok' },
      reserveFloor: { pass: true, reason: 'ok' },
      prepaidBalance: { pass: true, reason: 'ok' },
    };

    if (this.isKillSwitchActive()) {
      checks.killSwitch = { pass: false, reason: 'kill_switch_active' };
    }

    if (!providerHealthy) {
      checks.providerHealth = { pass: false, reason: 'provider_unhealthy' };
    }

    if (modelConfidence < this.config.model.minModelConfidence) {
      checks.modelConfidence = {
        pass: false,
        reason: `model_confidence_below_threshold:${modelConfidence}`,
      };
    }

    if (edgePct < this.config.limits.minEdgePct) {
      checks.minimumEdge = {
        pass: false,
        reason: `edge_below_minimum:${edgePct}`,
      };
    }

    if (confidencePct < this.config.limits.minConfidence) {
      checks.minimumConfidence = {
        pass: false,
        reason: `confidence_below_minimum:${confidencePct}`,
      };
    }

    if (requested <= 0) {
      checks.maxTradeNotional = { pass: false, reason: 'requested_notional_invalid' };
    }

    let approvedNotionalUsd = Math.min(requested, this.config.limits.maxTradeNotionalUsd);
    if (requested > this.config.limits.maxTradeNotionalUsd) {
      checks.maxTradeNotional = {
        pass: false,
        reason: `requested_above_max_trade:${requested}`,
      };
    }

    const todayVolume = this.getTodayVolumeUsd();
    if (todayVolume + approvedNotionalUsd > this.config.limits.maxDailyNotionalUsd) {
      checks.maxDailyNotional = {
        pass: false,
        reason: `daily_cap_exceeded:${todayVolume + approvedNotionalUsd}`,
      };
    }

    const openRisk = this.getOpenRiskUsd();
    if (openRisk + approvedNotionalUsd > this.config.limits.maxOpenRiskUsd) {
      checks.maxOpenRisk = {
        pass: false,
        reason: `open_risk_cap_exceeded:${openRisk + approvedNotionalUsd}`,
      };
    }

    if (this.state.openPositions.length >= this.config.limits.maxOpenPositions) {
      checks.maxOpenPositions = {
        pass: false,
        reason: `max_open_positions_reached:${this.state.openPositions.length}`,
      };
    }

    if (this.config.limits.prepaidBalanceUsd < this.config.limits.reserveFloorUsd) {
      checks.reserveFloor = { pass: false, reason: 'reserve_floor_breached' };
    }

    if (approvedNotionalUsd > this.config.limits.prepaidBalanceUsd) {
      checks.prepaidBalance = { pass: false, reason: 'insufficient_prepaid_balance' };
    }

    const failedChecks = Object.values(checks).filter((check) => !check.pass);
    const action = failedChecks.length === 0 ? 'PLACE_ORDER' : 'HOLD';

    return {
      action,
      requestedNotionalUsd: requested,
      approvedNotionalUsd,
      mode: this.getMode(),
      checks,
      failedReasons: failedChecks.map((check) => check.reason),
    };
  }

  executePaperTrade(signal, decision) {
    const executionAt = new Date().toISOString();
    const tradeId = crypto.randomUUID();

    if (decision.action !== 'PLACE_ORDER') {
      return {
        tradeId,
        executionAt,
        status: 'not_executed',
        reason: 'decision_hold',
      };
    }

    const todayKey = utcDayKey();
    this.state.dailyVolumeByUtcDate[todayKey] =
      safeNumber(this.state.dailyVolumeByUtcDate[todayKey], 0) + decision.approvedNotionalUsd;

    const position = {
      positionId: crypto.randomUUID(),
      marketId: signal.marketId || 'unknown_market',
      side: signal.side || 'YES',
      notionalUsd: decision.approvedNotionalUsd,
      openedAt: executionAt,
      strategy: signal.strategy || 'unspecified',
    };

    this.state.openPositions.push(position);
    this.state.trades.push({
      tradeId,
      mode: this.getMode(),
      status: 'paper_filled',
      executionAt,
      marketId: position.marketId,
      side: position.side,
      notionalUsd: position.notionalUsd,
      edgePct: safeNumber(signal.edgePct, 0),
      confidencePct: safeNumber(signal.confidencePct, 0),
      strategy: position.strategy,
    });

    this.#saveState();

    return {
      tradeId,
      status: 'paper_filled',
      executionAt,
      position,
    };
  }

  closePosition(positionId) {
    const index = this.state.openPositions.findIndex((p) => p.positionId === positionId);
    if (index === -1) {
      return { closed: false, reason: 'position_not_found' };
    }

    const [closed] = this.state.openPositions.splice(index, 1);
    this.#saveState();

    return { closed: true, position: closed };
  }
}
