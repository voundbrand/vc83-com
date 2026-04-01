import crypto from 'node:crypto';

const ALLOWED_SOURCES = new Set(['operator_manual', 'openclaw_agent']);
const ALLOWED_ACTIONS = new Set(['OPEN_POSITION', 'CLOSE_POSITION']);
const ALLOWED_SIDES = new Set(['YES', 'NO']);

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizedText(value) {
  const output = String(value || '').trim();
  return output.length > 0 ? output : '';
}

function normalizedUpper(value) {
  return normalizedText(value).toUpperCase();
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function buildPolicyDecisionId(payload) {
  const hash = crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
  return `pdec_${hash.slice(0, 16)}`;
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => String(value)))].sort((a, b) => a.localeCompare(b));
}

export function validateTradeIntent(rawIntent = {}) {
  const errors = [];
  const source = normalizedText(rawIntent.source || 'openclaw_agent');
  const action = normalizedUpper(rawIntent.action || 'OPEN_POSITION');
  const side = normalizedUpper(rawIntent.side || 'YES');
  const requestedNotionalUsd = safeNumber(rawIntent.requestedNotionalUsd, NaN);

  if (!ALLOWED_SOURCES.has(source)) {
    errors.push(`intent_source_invalid:${source || 'missing'}`);
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    errors.push(`intent_action_invalid:${action || 'missing'}`);
  }

  if (!normalizedText(rawIntent.marketId)) {
    errors.push('intent_market_id_missing');
  }

  if (!ALLOWED_SIDES.has(side)) {
    errors.push(`intent_side_invalid:${side || 'missing'}`);
  }

  if (!Number.isFinite(requestedNotionalUsd) || requestedNotionalUsd <= 0) {
    errors.push('intent_notional_invalid');
  }

  const intentId = normalizedText(rawIntent.intentId || rawIntent.id);
  if (!intentId) {
    errors.push('intent_id_missing');
  }

  const executionProfileId = normalizedText(rawIntent.executionProfileId || rawIntent.profileId);
  if (!executionProfileId) {
    errors.push('intent_profile_id_missing');
  }

  const intent = {
    intentId,
    source,
    action,
    marketId: normalizedText(rawIntent.marketId),
    side,
    strategy: normalizedText(rawIntent.strategy || 'openclaw'),
    requestedNotionalUsd: Number.isFinite(requestedNotionalUsd) ? requestedNotionalUsd : 0,
    executionProfileId,
  };

  return {
    ok: errors.length === 0,
    intent,
    errors: uniqueSorted(errors),
  };
}

export function compileTradeIntentPolicy(input = {}) {
  const intentValidation = input.intentValidation || { ok: false, intent: {}, errors: ['intent_missing'] };
  const executionProfile = input.executionProfile || {};
  const venueEligibility = input.venueEligibility || {};
  const runtime = input.runtime || {};
  const operatorApproval = input.operatorApproval || {};

  const rejectReasons = [];

  if (!intentValidation.ok) {
    rejectReasons.push(...(intentValidation.errors || []));
  }

  const intent = intentValidation.intent || {};
  const mode = normalizedText(runtime.mode || 'paper_sim') || 'paper_sim';
  const killSwitchActive = Boolean(runtime.killSwitchActive);
  const profileStatus = normalizedUpper(executionProfile.status || 'SIM_ONLY');
  const profileId = normalizedText(executionProfile.id || intent.executionProfileId);
  const allowAgentIntents = Boolean(executionProfile.allowAgentIntents);
  const classification = normalizedText(venueEligibility.classification || 'unknown') || 'unknown';
  const approvalRequired = Boolean(operatorApproval.required);
  const approvalGranted = Boolean(operatorApproval.granted);
  const intentsGloballyEnabled =
    operatorApproval.globallyEnabled === undefined ? true : Boolean(operatorApproval.globallyEnabled);

  if (killSwitchActive) {
    rejectReasons.push('kill_switch_active');
  }

  if (intent.source === 'openclaw_agent' && !allowAgentIntents) {
    rejectReasons.push('agent_intents_disabled_for_profile');
  }

  if (intent.source === 'openclaw_agent' && !intentsGloballyEnabled) {
    rejectReasons.push('agent_intents_globally_disabled');
  }

  if (intent.source === 'openclaw_agent' && approvalRequired && !approvalGranted) {
    rejectReasons.push('operator_approval_missing');
  }

  if (mode === 'live_limited' && profileStatus !== 'ACTIVE') {
    rejectReasons.push(`execution_profile_not_active:${profileStatus || 'UNKNOWN'}`);
  }

  if (mode === 'live_limited' && profileId && intent.executionProfileId && profileId !== intent.executionProfileId) {
    rejectReasons.push('intent_profile_mismatch');
  }

  if (mode === 'live_limited' && classification !== 'eligible') {
    rejectReasons.push(`venue_eligibility_${classification}`);
  }

  const policyPayload = {
    mode,
    killSwitchActive,
    profileId,
    profileStatus,
    allowAgentIntents,
    classification,
    approvalRequired,
    approvalGranted,
    intentsGloballyEnabled,
    intentValidation,
  };

  const policyDecisionId = buildPolicyDecisionId(policyPayload);
  const sortedRejectReasons = uniqueSorted(rejectReasons);
  const allowedAction = sortedRejectReasons.length === 0 ? 'ALLOW_ORDER' : 'DENY';

  return {
    policyDecisionId,
    evaluatedAt: new Date().toISOString(),
    allowedAction,
    rejectReasons: sortedRejectReasons,
    context: {
      mode,
      executionProfileId: profileId || null,
      executionProfileStatus: profileStatus || null,
      venueEligibility: classification || null,
      killSwitchActive,
      approvalRequired,
      approvalGranted,
      intentsGloballyEnabled,
    },
    intent: intentValidation.intent || null,
    intentValid: Boolean(intentValidation.ok),
  };
}
